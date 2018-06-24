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

    let css = new CSS()

    let frame = new Frame($('#preview'), 0,0, 'w-frame')
    frame.draw()
    let menu = new Menu(frame, 0, 20, 'w-menu', css)
    menu.draw()
    menu.font('Arial Black', 900, '255', 12.4)
})

function $(query) {
    return document.querySelector(query)
}

function reg_reload() {
    fetch('/cgi-bin/registry/get').then( r => r.json())
	.then( r => gstate.registry = r)
}

class CSS {
    constructor() {
	let node = document.createElement('style')
	node.id = 'css-global'
	node.innerHTML = `
.w-frame {
  border: 1px solid #4891b8;
  width: 100%;
  height: 300px;
}

.w-menu__topitem {
  margin: 0 5px;
  padding: 5px;
}
.w-menu__topitem--selected {
  background-color: #cce8ff;
}
.w-menu hr {
  border: 1px solid #f0f0f0;
  margin: 4px 0 0;
}
`
	document.body.appendChild(node)

	this.node = Array.from(document.styleSheets)
	    .filter( v => v.ownerNode.id === node.id)[0]
    }
}

class Widget {
    constructor(parent, x,y, klass, css) {
	this.parent = parent
	this.x = x
	this.y = y
	this.klass = klass
	this.css = css
	this.id = 'widget-' + Math.random().toString(36).substring(2,7)

	this._node = document.createElement('div')
	this._node.id = this.id
	this._node.className = this.klass
	this._node.style.position = 'relative'
	this._node.style.top = `${y}px`
	this._node.style.left = `${x}px`
    }

    draw() { this.redraw(this.node()) }

    node() { return $(`${this.id}`) || this._node }

    redraw(node) {
	let old = $(`${this.id}`)
	if (old) {
	    console.log('replace')
	    old.parentNode.replaceChild(node, old)
	} else {
	    let parent = this.parent instanceof Widget ? this.parent.node() : this.parent
	    parent.appendChild(node)
	}
    }

    css_rule(name) {
	return Array.from(this.css.node.cssRules)
	    .filter( v => v.selectorText === name)[0]
    }
}

class Frame extends Widget {}

class Menu extends Widget {
    font(name, weight, is_italic, size) {
	let r = this.css_rule('.w-menu__topitem')
	r.style.fontFamily = name
	r.style.fontWeight = weight
	if (Number(is_italic)) r.style.fontStyle = 'italic'
	r.style.fontSize = `${size}pt`
    }
    draw() {
	let node = this.node()
	let k = `${this.klass}__topitem`
	node.innerHTML = `<span class='${k}'>File</span><span class='${k}'>Edit</span><span class='${k}'>Format</span><span class='${k}'>View</span><span class='${k} ${k}--selected'>Help</span>

<hr>

`
	this.redraw(node)
    }
}
