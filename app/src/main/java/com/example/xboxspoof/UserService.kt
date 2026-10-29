package com.example.xboxspoof

import java.io.EOFException
import java.io.FileInputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.system.exitProcess

private const val NAME_XBOX = "Xbox Wireless Controller"
private const val NAME_DS4 = "Wireless Controller"

// Button maps: real controller (Android/Xbox-style evdev codes) -> code the virtual pad sends.
// Taken from Android's own key layout files (frameworks/base/data/keyboards).

// Vendor_045e_Product_02fd.kl (Xbox One S, Bluetooth). The View/Back button must be KEY_BACK (158),
// not BTN_SELECT (314), otherwise Android ignores it.
private val XBOX_MAP = mapOf(
    304 to 304, 305 to 305, 307 to 307, 308 to 308, 310 to 310, 311 to 311,
    314 to 158, 315 to 315, 316 to 316, 317 to 317, 318 to 318
)

// Vendor_054c_Product_09cc.kl (DualShock 4). Completely different numbering from Xbox:
// 304 Square, 305 Cross, 306 Circle, 307 Triangle, 308 L1, 309 R1, 310 L2, 311 R2,
// 312 Share, 313 Options, 314 L3, 315 R3, 316 PS.
private val DS4_MAP = mapOf(
    304 to 305, // A  -> Cross
    305 to 306, // B  -> Circle
    307 to 304, // X  -> Square
    308 to 307, // Y  -> Triangle
    310 to 308, // L1
    311 to 309, // R1
    312 to 310, // L2 (button)
    313 to 311, // R2 (button)
    314 to 312, // Select/View -> Share
    315 to 313, // Start/Menu  -> Options
    316 to 316, // Home        -> PS
    317 to 314, // L3
    318 to 315  // R3
)

private val ABS = mapOf(
    "ABS_X" to 0, "ABS_Y" to 1, "ABS_Z" to 2, "ABS_RX" to 3, "ABS_RY" to 4, "ABS_RZ" to 5,
    "ABS_GAS" to 9, "ABS_BRAKE" to 10, "ABS_HAT0X" to 16, "ABS_HAT0Y" to 17
)

/** Runs inside the Shizuku process as the adb "shell" user (uid 2000). */
class UserService() : IUserService.Stub() {

    @Volatile private var proc: Process? = null
    @Volatile private var input: FileInputStream? = null
    @Volatile private var anchor = false
    @Volatile private var log = ""
    @Volatile private var frames = 0L
    @Volatile private var note = ""
    private val lock = Any()

    override fun destroy() {
        stopInternal()
        exitProcess(0)
    }

    override fun listDevices(): String {
        val text = sh("/system/bin/getevent", "-lp")
        val sb = StringBuilder()
        for (block in text.split("add device ").drop(1)) {
            val path = Regex("/dev/input/event\\d+").find(block)?.value ?: continue
            val name = Regex("name:\\s+\"(.*)\"").find(block)?.groupValues?.get(1) ?: path
            val gamepad = (block.contains("BTN_GAMEPAD") || block.contains("BTN_SOUTH")) && block.contains("ABS_X")
            // hide our own virtual pads (real Xbox/DS4 pads work natively and need no bridging)
            if (gamepad && name != NAME_XBOX && name != NAME_DS4) sb.append(path).append('|').append(name).append('\n')
        }
        return sb.toString()
    }

    override fun start(devPath: String, mode: Int): String {
        stopInternal()
        val ds4 = mode == 1
        return try {
            anchor = devPath.isEmpty()
            val ranges = if (anchor) emptyMap() else readRanges(devPath)
            val p = ProcessBuilder("/system/bin/uinput", "-").redirectErrorStream(true).start()
            proc = p
            log = ""
            frames = 0
            note = ""
            Thread {
                try {
                    val b = ByteArray(1024)
                    while (true) {
                        val n = p.inputStream.read(b)
                        if (n < 0) break
                        log = (log + String(b, 0, n)).takeLast(2000)
                    }
                } catch (_: Exception) {}
            }.apply { isDaemon = true }.start()

            send(p.outputStream, registerJson(ds4))
            send(p.outputStream, """{"id":1,"command":"delay","duration":500}""")
            send(p.outputStream, centerJson(ds4))

            if (!anchor) {
                Thread { forward(devPath, p, ranges, ds4) }.apply { isDaemon = true }.start()
            }
            Thread.sleep(800)
            if (log.isBlank()) "ok" else "ok\nuinput said: $log"
        } catch (e: Exception) {
            "error: ${e.message}"
        }
    }

    override fun stop() = stopInternal()

    override fun status(): String = log

    override fun stats(): String =
        "${if (proc?.isAlive == true) 1 else 0}|$frames|${if (anchor) 1 else 0}|$note"

    // ---------------------------------------------------------------

    private fun stopInternal() {
        val p = proc
        proc = null
        try { input?.close() } catch (_: Exception) {}
        input = null
        try { p?.destroy() } catch (_: Exception) {}
    }

    private fun sh(vararg cmd: String): String {
        val p = ProcessBuilder(*cmd).redirectErrorStream(true).start()
        val t = p.inputStream.bufferedReader().readText()
        p.waitFor()
        return t
    }

    private fun send(o: OutputStream, s: String) {
        synchronized(lock) {
            o.write((s + "\n").toByteArray())
            o.flush()
        }
    }

    private fun readRanges(dev: String): Map<Int, IntArray> {
        val text = sh("/system/bin/getevent", "-lp", dev)
        val m = HashMap<Int, IntArray>()
        Regex("(ABS_\\w+)\\s*:\\s*value\\s+(-?\\d+),\\s*min\\s+(-?\\d+),\\s*max\\s+(-?\\d+)")
            .findAll(text).forEach {
                val code = ABS[it.groupValues[1]] ?: return@forEach
                m[code] = intArrayOf(it.groupValues[3].toInt(), it.groupValues[4].toInt())
            }
        return m
    }

    private fun ab(c: Int, lo: Int, hi: Int, fuzz: Int, flat: Int) =
        """{"code":$c,"info":{"value":0,"minimum":$lo,"maximum":$hi,"fuzz":$fuzz,"flat":$flat}}"""

    private fun registerJson(ds4: Boolean): String {
        val name: String; val vid: Int; val pid: Int
        val axes: List<Int>; val abs: List<String>
        if (ds4) {
            // Sony DualShock 4 v2: VID 0x054C, PID 0x09CC. Sticks and triggers 0..255, like the real pad.
            name = NAME_DS4; vid = 1356; pid = 2508
            axes = listOf(0, 1, 2, 3, 4, 5, 16, 17)
            abs = listOf(
                ab(0, 0, 255, 0, 15), ab(1, 0, 255, 0, 15), ab(2, 0, 255, 0, 15), ab(5, 0, 255, 0, 15),
                ab(3, 0, 255, 0, 0), ab(4, 0, 255, 0, 0), ab(16, -1, 1, 0, 0), ab(17, -1, 1, 0, 0)
            )
        } else {
            // Microsoft Xbox One S (Bluetooth): VID 0x045E, PID 0x02FD.
            name = NAME_XBOX; vid = 1118; pid = 765
            axes = listOf(0, 1, 2, 5, 9, 10, 16, 17)
            abs = listOf(
                ab(0, -32768, 32767, 16, 128), ab(1, -32768, 32767, 16, 128),
                ab(2, -32768, 32767, 16, 128), ab(5, -32768, 32767, 16, 128),
                ab(9, 0, 1023, 0, 0), ab(10, 0, 1023, 0, 0), ab(16, -1, 1, 0, 0), ab(17, -1, 1, 0, 0)
            )
        }
        val keys = (if (ds4) DS4_MAP else XBOX_MAP).values.toSortedSet().joinToString(",")
        return """{"id":1,"command":"register","name":"$name","vid":$vid,"pid":$pid,"bus":"bluetooth",""" +
            """"configuration":[{"type":100,"data":[1,3]},{"type":101,"data":[$keys]},""" +
            """{"type":103,"data":[${axes.joinToString(",")}]}],""" +
            """"abs_info":[${abs.joinToString(",")}]}"""
    }

    private fun centerJson(ds4: Boolean): String =
        if (ds4) """{"id":1,"command":"inject","events":[3,0,128,3,1,128,3,2,128,3,5,128,3,3,0,3,4,0,3,16,0,3,17,0,0,0,0]}"""
        else """{"id":1,"command":"inject","events":[3,0,0,3,1,0,3,2,0,3,5,0,3,9,0,3,10,0,3,16,0,3,17,0,0,0,0]}"""

    // kind: 0 = stick, 1 = trigger, 2 = hat
    private fun scale(kind: Int, ds4: Boolean, v: Int, r: IntArray?): Int {
        if (kind == 2) return v.coerceIn(-1, 1)
        val lo = r?.get(0) ?: 0
        val hi = r?.get(1) ?: 255
        if (hi == lo) return 0
        val f = (v - lo).toLong()
        return when {
            ds4 -> ((f * 255L) / (hi - lo)).toInt()
            kind == 0 -> ((f * 65535L) / (hi - lo) - 32768L).toInt()
            else -> ((f * 1023L) / (hi - lo)).toInt()
        }
    }

    private fun forward(dev: String, p: Process, ranges: Map<Int, IntArray>, ds4: Boolean) {
        // struct input_event: timeval (16 bytes on 64-bit, 8 on 32-bit) + u16 type + u16 code + s32 value
        val size = if (android.os.Process.is64Bit()) 24 else 16
        val off = size - 8
        val keyMap = if (ds4) DS4_MAP else XBOX_MAP

        // Logical channels: 0 LX, 1 LY, 2 RX, 3 RY, 4 LT, 5 RT, 6 HatX, 7 HatY.
        // Real pads come in two common layouts: "xpad" (RX/RY = right stick, Z/RZ = triggers)
        // and the Android-style one (Z/RZ = right stick, BRAKE/GAS = triggers, like the X5 Lite).
        val xpad = ranges.containsKey(3) && ranges.containsKey(4)
        val realToLogical: Map<Int, Int> =
            if (xpad) mapOf(0 to 0, 1 to 1, 3 to 2, 4 to 3, 2 to 4, 5 to 5, 16 to 6, 17 to 7)
            else mapOf(0 to 0, 1 to 1, 2 to 2, 5 to 3, 10 to 4, 9 to 5, 16 to 6, 17 to 7)
        val logicalToVirtual: List<Int> =
            if (ds4) listOf(0, 1, 2, 5, 3, 4, 16, 17) else listOf(0, 1, 2, 5, 10, 9, 16, 17)

        val buf = ByteArray(size)
        val bb = ByteBuffer.wrap(buf).order(ByteOrder.LITTLE_ENDIAN)
        val frame = StringBuilder()
        try {
            FileInputStream(dev).use { fin ->
                input = fin
                while (proc === p) {
                    var n = 0
                    while (n < size) {
                        val r = fin.read(buf, n, size - n)
                        if (r < 0) throw EOFException()
                        n += r
                    }
                    val type = bb.getShort(off).toInt() and 0xFFFF
                    val code = bb.getShort(off + 2).toInt() and 0xFFFF
                    val value = bb.getInt(off + 4)
                    when {
                        type == 1 && (value == 0 || value == 1) -> {
                            val vk = keyMap[code]
                            if (vk != null) frame.append(",1,$vk,$value")
                        }
                        type == 3 -> {
                            val l = realToLogical[code]
                            if (l != null) {
                                val kind = if (l < 4) 0 else if (l < 6) 1 else 2
                                frame.append(",3,${logicalToVirtual[l]},${scale(kind, ds4, value, ranges[code])}")
                            }
                        }
                        type == 0 && code == 0 && frame.isNotEmpty() -> {
                            send(p.outputStream, """{"id":1,"command":"inject","events":[${frame.substring(1)},0,0,0]}""")
                            frame.setLength(0)
                            frames++
                        }
                    }
                }
            }
        } catch (_: Exception) {
            if (proc === p) note = "Controller disconnected. Reconnect it, then tap Start the bridging again."
        }
    }
}
