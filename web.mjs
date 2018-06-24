import * as plainDialogs from './vendor/node_modules/plain-dialogs/index.mjs'

let gstate = {
    registry: null,
    modified: false
}

document.addEventListener("DOMContentLoaded", async function() {

    $('#exit').onclick = async () => {
	if (gstate.modified) {
	    if (!await plainDialogs.confirm2("You didn't press 'Save'. Still exit?")) return
	}
	fetch('/cgi-bin/exit').then( r => r.text()).then( () => {
	    document.querySelector('body').innerHTML = '<h1>Server has exited. Please close this tab.</h1>'
	})
	return false
    }

    await reg_reload()

    let frame = new Frame($('#preview'), 0,0, 'w-frame')
    frame.draw()
    let menu = new Menu(frame, 0, 20, 'w-menu')
    menu.draw()
})

function $(query) {
    return document.querySelector(query)
}

function reg_reload() {
    fetch('/cgi-bin/registry/get').then( r => r.json())
	.then( r => gstate.registry = r)
}

class Widget {
    constructor(parent, x,y, klass) {
	this.x = x
	this.y = y
	this.klass = klass
	this.parent = parent

	let node = document.createElement('style')
	node.className = 'css-injected'
	let css = `.${this.klass} {position:relative; top: ${y}px;left:${x}px;}`
	node.innerHTML = css + "\n" + this.css()
	document.body.appendChild(node)
    }
    node() {
	let old = $(`.${this.klass}`)
	if (old) return old

	let w = document.createElement('div')
	w.className = this.klass
	return w
    }
    redraw(node) {
	let old = $(`.${node.className}`)
	if (old) {
	    console.log('replace')
	    old.parentNode.replaceChild(node, old)
	} else {
	    let parent = this.parent instanceof Widget ? this.parent.node() : this.parent
	    parent.appendChild(node)
	}
    }
    draw() {
	this.redraw(this.node())
    }
}

class Frame extends Widget {
    css() {
	return `.${this.klass} {
  border: 1px solid #4891b8;
  width: 100%;
  height: 300px;
}`
    }
}

class Menu extends Widget {
    draw() {
	let node = this.node()
	let k = `${this.klass}__topitem`
	node.innerHTML = `<span class='${k}'>File</span><span class='${k}'>Edit</span><span class='${k}'>Format</span><span class='${k}'>View</span><span class='${k} ${k}--selected'>Help</span>

<hr>

`
	this.redraw(node)
    }

    css() {
	return `.${this.klass} {
}
.${this.klass}__topitem {
  margin: 0 5px;
  padding: 5px;
}
.${this.klass}__topitem--selected {
  background-color: #cce8ff;
}
.${this.klass} hr {
  border: 1px solid #f0f0f0;
  margin: 4px 0 0;
}`
    }
}
