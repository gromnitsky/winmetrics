// Uses WSH to run the app.

/* global WScript */
var sh = WScript.CreateObject("WScript.Shell")

var env = sh.Environment("Process")
var port = env("WINMETRICS_PORT") || 8765
env("WINMETRICS_BROWSER") = "1" // jscript is bizarre
var cmd = 'node server.js _out.i686-pc-cygwin/app'

var code = sh.Run(cmd, 1, true)

if (code === 2) {
    errx("The app is already running on port " + port
	 + ".\nSet WINMETRICS_PORT env var to a different number.")
} else if (code !== 0) {
    errx("'" + cmd + "' exit status: " + code)
}

function errx(msg) {
    sh.Popup(msg, 0, "winmetrics error", 0x10)
}
