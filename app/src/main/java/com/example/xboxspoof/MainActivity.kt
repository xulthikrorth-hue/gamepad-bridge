package com.example.xboxspoof

import android.app.Activity
import android.content.ComponentName
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Bundle
import android.os.IBinder
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import rikka.shizuku.Shizuku

class MainActivity : Activity() {

    private var svc: IUserService? = null
    private var binding = false
    private var paths = listOf<String>()
    private var lastMsg = ""

    private lateinit var status: TextView
    private lateinit var spinner: Spinner
    private lateinit var forward: CheckBox
    private lateinit var modeGroup: RadioGroup

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
            runOnUiThread { refreshDevices(); render() }
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

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val pad = (16 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, pad, pad, pad) }
        fun btn(t: String, f: () -> Unit) {
            root.addView(Button(this).apply { text = t; setOnClickListener { f() } })
        }
        status = TextView(this).apply { typeface = Typeface.MONOSPACE; textSize = 13f }
        root.addView(status)
        btn("1. Grant Shizuku permission") { askPermission() }
        btn("2. Refresh controller list") { refreshDevices() }
        modeGroup = RadioGroup(this).apply {
            orientation = RadioGroup.VERTICAL
            addView(RadioButton(this@MainActivity).apply { text = "Pretend to be: Xbox One controller"; id = 101 })
            addView(RadioButton(this@MainActivity).apply { text = "Pretend to be: DualShock 4 (DS4)"; id = 102 })
            check(101)
        }
        root.addView(modeGroup)
        spinner = Spinner(this)
        root.addView(spinner)
        forward = CheckBox(this).apply { text = "Forward this controller to the virtual pad" }
        root.addView(forward)
        btn("3. Start virtual Xbox pad") { startPad() }
        btn("Stop") { stopPad() }
        setContentView(ScrollView(this).apply { addView(root) })

        Shizuku.addBinderReceivedListenerSticky(binderListener)
        Shizuku.addBinderDeadListener(deadListener)
        Shizuku.addRequestPermissionResultListener(permListener)
        render()
    }

    override fun onResume() { super.onResume(); connectIfReady(); render() }

    override fun onDestroy() {
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

    private fun refreshDevices() {
        val s = svc ?: run { toast("Not connected to Shizuku yet"); return }
        Thread {
            val raw = try { s.listDevices() } catch (e: Exception) { "" }
            val list = raw.lines().filter { it.contains("|") }
            runOnUiThread {
                paths = list.map { it.substringBefore("|") }
                val labels = list.map { it.substringAfter("|") + "  (" + it.substringBefore("|").substringAfterLast("/") + ")" }
                spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)
                if (list.isEmpty()) toast("No controller found. Connect it first, then refresh.")
            }
        }.start()
    }

    private fun startPad() {
        val s = svc ?: run { toast("Not connected to Shizuku yet"); return }
        val path = if (forward.isChecked && paths.isNotEmpty()) paths[spinner.selectedItemPosition] else ""
        val mode = if (modeGroup.checkedRadioButtonId == 102) 1 else 0
        Thread {
            val r = try { s.start(path, mode) } catch (e: Exception) { "error: ${e.message}" }
            runOnUiThread { lastMsg = r; render() }
        }.start()
    }

    private fun stopPad() {
        val s = svc ?: return
        Thread {
            try { s.stop() } catch (_: Exception) {}
            runOnUiThread { lastMsg = "Stopped."; render() }
        }.start()
    }

    private fun toast(m: String) = Toast.makeText(this, m, Toast.LENGTH_SHORT).show()

    private fun render() {
        val running = Shizuku.pingBinder()
        status.text = "Shizuku running: $running\n" +
            "Permission granted: ${running && granted()}\n" +
            "Connected: ${svc != null}\n\n" +
            (if (lastMsg.isNotEmpty()) "$lastMsg\n\n" else "") +
            "Setup: turn on Developer options > Wireless debugging, open Shizuku and start it, " +
            "come back here and tap 1.\n\n" +
            "Test 1: connect your controller, leave the checkbox OFF, tap 3, then open the game. " +
            "If the real controller already works, you are done.\n" +
            "Test 2: if it does not, tick the checkbox with your controller selected, then tap 3 again.\nChanging Xbox/DS4? Tap 3 again to recreate the pad."
    }
}
