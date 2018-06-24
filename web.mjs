import * as plainDialogs from './vendor/node_modules/plain-dialogs/index.mjs'

let gstate = {
    registry: null,
    modified: false
}

reg_reload()

document.addEventListener("DOMContentLoaded", function() {

    document.querySelector('#exit').onclick = async () => {
	if (gstate.modified) {
	    if (!await plainDialogs.confirm2("You didn't press 'Save'. Still exit?")) return
	}
	fetch('/cgi-bin/exit').then( r => r.text()).then( () => {
	    document.querySelector('body').innerHTML = '<h1>Server has exited. Please close this tab.</h1>'
	})
	return false
    }
})

function reg_reload() {
    fetch('/cgi-bin/registry/get').then( r => r.json())
	.then( r => gstate.registry = r)
}
