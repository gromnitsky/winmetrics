// Uses WSH to run the app.

/* global WScript */
var sh = WScript.CreateObject("WScript.Shell")

var env = sh.Environment("Process")
var port = env("WINMETRICS_PORT") || 8765
var cmd = 'node server.js .'

// this is not a syntax error! this is jscript! see
// https://stackoverflow.com/q/18838213
env("WINMETRICS_BROWSER") = "1"
// `0` means hide the console win, `true` that the op is sync
var code = sh.Run(cmd, 0, true)

if (code === 2) {
    errx("The app is already running on 127.0.0.1:" + port
	 + ".\nSet WINMETRICS_PORT env var to a different number.")
} else if (code !== 0) {
    errx("'" + cmd + "' exit status: " + code)
}

function errx(msg) {
    sh.Popup(msg, 0, "winmetrics error", 0x10)
}
