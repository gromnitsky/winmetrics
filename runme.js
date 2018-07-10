// Uses WSH to run the app.

/* global WScript */
var sh = WScript.CreateObject("WScript.Shell")

var env = sh.Environment("Process")
var port = env("WINMETRICS_PORT") || 8765
var addr = "http://127.0.0.1:" + port
var cmd = 'node server.js .'

// this is not a syntax error! this is jscript! see
// https://stackoverflow.com/q/18838213
env("WINMETRICS_BROWSER") = "1"
// `0` means hide the console win, `true` that the op is sync
var code = sh.Run(cmd, 0, true)

if (code === 2) {
    var r = yesno("The app appears to be running on " + addr + "."
		  + "\n(To change the port number, "
		  + "set WINMETRICS_PORT env var.)"
		  + "\n\nOpen the above address in a browser?")
    if (r === 6 /* yes btn */) sh.Run(addr)

} else if (code !== 0) {
    errx("'" + cmd + "' exit status: " + code)
}

function errx(msg) { sh.Popup(msg, 0, "winmetrics error", 0x10) }
function yesno(msg) { return sh.Popup(msg, 0, "winmetrics", 4+48) }
