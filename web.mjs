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

    let frame = new Frame($('#preview'), 0,0)
    let menu = new Menu(frame, 0, 20, css)

    frame.draw()
    menu.draw()

    menu.controls_draw()
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
#controls h3 {
  margin: 0 0 1em;
}
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
    constructor(parent, x,y, css) {
	this.parent = parent
	this.x = x
	this.y = y
	this.css = css
	this.id = 'widget-' + Math.random().toString(36).substring(2,7)

	this._node = document.createElement('div')
	this._node.id = this.id
	this._node.style.position = 'relative'

	this.controls = $('#controls')
    }

    moveto(x,y) { [this.x, this.y] = [x,y] }

    node() { return $(`#${this.id}`) || this._node }

    draw() {
	if (!$(`#${this.id}`)) {
	    this._node.className = this.klass
	    let parent = this.parent instanceof Widget ? this.parent.node() : this.parent
	    parent.appendChild(this._node)
	}
	this.node().style.left = `${this.x}px`
	this.node().style.top = `${this.y}px`
    }

    css_rule(name) {
	return Array.from(this.css.node.cssRules)
	    .filter( v => v.selectorText === name)[0]
    }
}

class Frame extends Widget {
    constructor(parent, x,y) {
	super(parent, x,y)
	this.klass = 'w-frame'
    }
}

class Menu extends Widget {
    constructor(parent, x,y, css) {
	super(parent, x,y, css)
	this.klass = 'w-menu'
	this.conf = {
	    logfont: 'F4FFFFFF0000000000000000000000009001000000000001030201225300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000,Segoe UI,400,0,9.000000',
	    height: 19
	}
    }

    logfont2css() {
	let lf = this.conf.logfont.split(',')
	return { name: lf[1], weight: lf[2], italic: lf[3], size: lf[4] }
    }

    logfont2human() {
	let lf = this.conf.logfont.split(',')
	return `${lf[1]} ${lf[4]}`
    }

    font_update() {
	let r = this.css_rule(`.${this.klass}__topitem`)
	let font = this.logfont2css()
	r.style.fontFamily = font.name
	r.style.fontWeight = font.weight
	r.style.fontStyle = Number(font.italic) ? 'italic' : 'normal'
	r.style.fontSize = `${font.size}pt`
    }

    draw() {
	super.draw()
	let node = this.node()
	let k = `${this.klass}__topitem`
	node.innerHTML = `<span class='${k}'>File</span><span class='${k}'>Edit</span><span class='${k}'>Format</span><span class='${k}'>View</span><span class='${k} ${k}--selected'>Help</span>

<hr>

`
	this.font_update()
    }

    controls_activate() {
	$('#controls button').onclick = () => {
	    fetch('/cgi-bin/choosefont').then( r => r.text())
		.then( r => {
		    this.conf.logfont = r.trim()
		    this.controls_draw()
		})
	}
	$('#controls input').onchange = el => {
	    this.conf.height = el.target.value
	    // TODO
	    this.controls_draw()
	}
    }

    controls_draw() {
	this.controls.innerHTML = `<h3>Menu</h3>
<p>Font: <button>${this.logfont2human()}</button></>
<p>Row height: <input type="number" min="0" max="50" value="${this.conf.height}" step="1"> px</p>
`
	this.controls_activate()
	this.draw()
    }
}
