package com.example.xboxspoof

import android.app.Activity
import android.app.AlertDialog
import android.content.ComponentName
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.IBinder
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import rikka.shizuku.Shizuku

private val GREEN = Color.parseColor("#2E7D32")
private val RED = Color.parseColor("#C62828")
private val ORANGE = Color.parseColor("#E65100")
private val GREY = Color.parseColor("#455A64")

class MainActivity : Activity() {

    private var svc: IUserService? = null
    private var binding = false
    @Volatile private var polling = false
    @Volatile private var pollGen = 0

    private var selectedName = ""
    private var bridgeRunning = false
    private var frames = 0L
    private var note = ""
    private var lastMsg = ""
    private var activeDesc = ""

    private lateinit var banner: TextView
    private lateinit var ctrlText: TextView
    private lateinit var grantBtn: Button
    private lateinit var modeGroup: RadioGroup
    private val prefs by lazy { getSharedPreferences("gb", MODE_PRIVATE) }

    private val args by lazy {
        // version changes with every install, so Shizuku restarts the service with the new code
        val ver = (packageManager.getPackageInfo(packageName, 0).lastUpdateTime / 1000L).toInt()
        Shizuku.UserServiceArgs(ComponentName(packageName, UserService::class.java.name))
            .processNameSuffix("uinput").daemon(true).version(ver)
    }

    private val conn = object : ServiceConnection {
        override fun onServiceConnected(n: ComponentName?, b: IBinder?) {
            svc = IUserService.Stub.asInterface(b)
            binding = false
            runOnUiThread { render() }
        }
        override fun onServiceDisconnected(n: ComponentName?) {
            svc = null
            binding = false
            runOnUiThread { render() }
        }
    }

    private val binderListener = Shizuku.OnBinderReceivedListener { runOnUiThread { connectIfReady(); render() } }
    private val deadListener = Shizuku.OnBinderDeadListener { svc = null; binding = false; runOnUiThread { render() } }
    private val permListener = Shizuku.OnRequestPermissionResultListener { _, _ -> runOnUiThread { connectIfReady(); render() } }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        selectedName = prefs.getString("ctrl", "") ?: ""

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        fun add(v: View, top: Int = 12) {
            root.addView(v, LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = dp(top) })
        }
        fun button(t: String, color: Int?, f: () -> Unit) = Button(this).apply {
            text = t
            isAllCaps = false
            setOnClickListener { f() }
            if (color != null) {
                setTextColor(Color.WHITE)
                background = GradientDrawable().apply { setColor(color); cornerRadius = dp(12).toFloat() }
            }
        }

        banner = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 16f
            typeface = Typeface.DEFAULT_BOLD
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }
        add(banner, 0)

        grantBtn = button("Grant Shizuku permission", null) { askPermission() }
        add(grantBtn)

        add(TextView(this).apply { text = "Pretend to be:"; textSize = 16f; typeface = Typeface.DEFAULT_BOLD }, 20)
        modeGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            addView(RadioButton(this@MainActivity).apply { text = "Xbox One Controller"; id = 101 })
            addView(RadioButton(this@MainActivity).apply { text = "Dualshock 4 Controller"; id = 102 })
            check(if (prefs.getInt("mode", 0) == 1) 102 else 101)
        }
        add(modeGroup, 4)

        add(button("Choose controller", null) { chooseController() }, 16)
        ctrlText = TextView(this).apply { textSize = 14f }
        add(ctrlText, 6)

        add(button("Start the bridging", GREEN) { startPad() }, 20)
        add(button("Stop", RED) { stopPad() }, 10)

        add(TextView(this).apply {
            textSize = 12f
            text = "How to use:\n" +
                "1. Start Shizuku (Wireless debugging), then tap Grant.\n" +
                "2. Connect your controller and tap Choose controller.\n" +
                "3. Pick Xbox One or Dualshock 4.\n" +
                "4. Tap Start the bridging, then open your game.\n\n" +
                "The bridge should keep running after you close this app. Open it again to check or stop it."
        }, 20)

        setContentView(ScrollView(this).apply { addView(root) })

        Shizuku.addBinderReceivedListenerSticky(binderListener)
        Shizuku.addBinderDeadListener(deadListener)
        Shizuku.addRequestPermissionResultListener(permListener)
        render()
    }

    override fun onResume() {
        super.onResume()
        connectIfReady()
        startPolling()
        render()
    }

    override fun onPause() {
        polling = false
        super.onPause()
    }

    override fun onDestroy() {
        polling = false
        Shizuku.removeBinderReceivedListener(binderListener)
        Shizuku.removeBinderDeadListener(deadListener)
        Shizuku.removeRequestPermissionResultListener(permListener)
        super.onDestroy()  // the daemon service keeps the pad alive after the app closes
    }

    private fun granted() =
        Shizuku.pingBinder() && Shizuku.checkSelfPermission() == PackageManager.PERMISSION_GRANTED

    private fun askPermission() {
        if (!Shizuku.pingBinder()) { toast("Start Shizuku first (Wireless debugging)"); return }
        if (granted()) connectIfReady() else Shizuku.requestPermission(1)
    }

    private fun connectIfReady() {
        if (svc == null && !binding && granted()) {
            binding = true
            Shizuku.bindUserService(args, conn)
        }
    }

    private fun startPolling() {
        if (polling) return
        polling = true
        val gen = ++pollGen
        Thread {
            while (polling && gen == pollGen) {
                val s = svc
                var txt: String? = null
                if (s != null) {
                    try { txt = s.stats() } catch (_: Exception) {}
                }
                runOnUiThread {
                    if (txt != null) {
                        val p = txt.split("|", limit = 3)
                        if (p.size == 3) {
                            bridgeRunning = p[0] == "1"
                            frames = p[1].toLongOrNull() ?: 0L
                            note = p[2]
                        }
                    }
                    render()
                }
                Thread.sleep(500)
            }
        }.start()
    }

    private fun chooseController() {
        val s = svc ?: run { toast("Not connected to Shizuku yet"); return }
        Thread {
            val raw = try { s.listDevices() } catch (e: Exception) { "" }
            val list = raw.lines().filter { it.contains("|") }
                .map { it.substringBefore("|") to it.substringAfter("|") }
            runOnUiThread {
                if (list.isEmpty()) {
                    AlertDialog.Builder(this)
                        .setTitle("No controllers found")
                        .setMessage("Connect your controller (Bluetooth, USB or 2.4 GHz) and try again.")
                        .setPositiveButton("Try again") { _, _ -> chooseController() }
                        .setNegativeButton("Cancel", null)
                        .show()
                } else {
                    val labels = list.map { it.second + "  (" + it.first.substringAfterLast("/") + ")" }.toTypedArray()
                    AlertDialog.Builder(this)
                        .setTitle("Controllers found")
                        .setItems(labels) { _, i ->
                            selectedName = list[i].second
                            prefs.edit().putString("ctrl", selectedName).apply()
                            render()
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                }
            }
        }.start()
    }

    private fun startPad() {
        val s = svc ?: run { toast("Not connected to Shizuku yet"); return }
        val name = selectedName
        if (name.isEmpty()) { toast("Choose a controller first"); chooseController(); return }
        val mode = if (modeGroup.checkedRadioButtonId == 102) 1 else 0
        prefs.edit().putInt("mode", mode).apply()
        lastMsg = ""
        Thread {
            // the event number can change between connections, so look the controller up by name again
            val raw = try { s.listDevices() } catch (e: Exception) { "" }
            val path = raw.lines().firstOrNull { it.substringAfter("|", "") == name }?.substringBefore("|")
            val r = if (path == null) "error: \"$name\" not found. Connect it, then choose it again."
                    else try { s.start(path, mode) } catch (e: Exception) { "error: ${e.message}" }
            runOnUiThread {
                if (r.startsWith("error")) {
                    lastMsg = r
                    bridgeRunning = false
                } else {
                    bridgeRunning = true
                    frames = 0
                    note = ""
                    lastMsg = if (r.contains("uinput said")) r.substringAfter("\n") else ""
                    activeDesc = "$name  →  " + if (mode == 1) "Dualshock 4" else "Xbox One"
                    toast("Bridge started")
                }
                render()
            }
        }.start()
    }

    private fun stopPad() {
        val s = svc ?: return
        Thread {
            try { s.stop() } catch (_: Exception) {}
            runOnUiThread {
                bridgeRunning = false
                lastMsg = ""
                activeDesc = ""
                toast("Bridge stopped")
                render()
            }
        }.start()
    }

    private fun toast(m: String) = Toast.makeText(this, m, Toast.LENGTH_SHORT).show()

    private fun render() {
        val shizukuUp = Shizuku.pingBinder()
        val ok = shizukuUp && granted()
        grantBtn.visibility = if (ok) View.GONE else View.VISIBLE
        ctrlText.text = "Controller: " + if (selectedName.isEmpty()) "none chosen yet" else selectedName

        val bg: Int
        val msg: String
        when {
            !shizukuUp -> { bg = ORANGE; msg = "Shizuku is not running.\nOpen Shizuku and start it (Wireless debugging)." }
            !ok -> { bg = ORANGE; msg = "Tap \"Grant Shizuku permission\" below." }
            svc == null -> { bg = GREY; msg = "Connecting to Shizuku…" }
            bridgeRunning -> {
                bg = GREEN
                msg = "● BRIDGE IS RUNNING\n" +
                    (if (activeDesc.isNotEmpty()) "$activeDesc\n" else "") +
                    "Inputs passed through: $frames" +
                    (if (note.isNotEmpty()) "\n⚠ $note" else "") +
                    (if (lastMsg.isNotEmpty()) "\n$lastMsg" else "")
            }
            lastMsg.startsWith("error") -> { bg = RED; msg = lastMsg }
            else -> { bg = GREY; msg = "Bridge is stopped." + (if (note.isNotEmpty()) "\n$note" else "") }
        }
        banner.setBackgroundColor(bg)
        banner.text = msg
    }
}
