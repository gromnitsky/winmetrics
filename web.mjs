import * as plainDialogs from './vendor/node_modules/plain-dialogs/index.mjs'

let global_state = {
    modified: false
}

document.addEventListener("DOMContentLoaded", function() {

    $('#exit').onclick = async () => {
	if (global_state.modified) {
	    if (!await plainDialogs.confirm2("You didn't press 'Save'. Still exit?")) return
	}
	fetch('/cgi-bin/exit').then(fetcherr).then( r => r.text()).then( () => {
	    document.querySelector('body').innerHTML = '<h1>Server has exited. Please close this tab.</h1>'
	})
	return false
    }

    let registry = new Registry()
    let css = new CSS()

    let frame = new Frame($('#preview'), 0,0)
    let menu = new Menu(frame, 0, 20,  css, $('#controls'), registry)

    frame.draw()
    menu.draw()

    menu.controls_draw()
})

function fetcherr(res) {
    if (!res.ok) throw Error(res.statusText)
    return res;
}

function $(query) {
    return document.querySelector(query)
}

class Registry {
    download() {
	if (this._download) return this._download
	return this._download = fetch('/cgi-bin/registry/get')
	    .then(fetcherr).then( r => r.json())
    }
    async get(name, def) {
	let r = await this.download()
	return r[name] ? r[name].val : def
    }
    async get_menu(name, def) {
	let r = await this.get(name, def)
	return this._download = fetch(`/cgi-bin/logfont?v=${r}`)
	    .then(fetcherr).then( r => r.text())
    }
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

    rule(name) {
	return Array.from(this.node.cssRules)
	    .filter( v => v.selectorText === name)[0]
    }
}

class Widget {
    constructor(parent, x,y, css, controls, registry) {
	this.parent = parent
	this.x = x
	this.y = y
	this.css = css
	this.controls = controls
	this.registry = registry

	this.id = 'widget-' + Math.random().toString(36).substring(2,7)
	this._node = document.createElement('div')
	this._node.id = this.id
	this._node.style.position = 'relative'
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
}

class Frame extends Widget {
    constructor(parent, x,y) {
	super(parent, x,y)
	this.klass = 'w-frame'
    }
}

class Logfont {
    constructor(choosefont_res) { this.cf = choosefont_res.trim().split(",") }
    lf() { return this.cf[0] }
    css() {
	return {
	    name: this.cf[1],
	    weight: this.cf[2],
	    italic: this.cf[3],
	    size: this.cf[4]
	}
    }
    button() { return `${this.cf[1]} ${this.cf[4]}` }
}

class Menu extends Widget {
    constructor(parent, x,y, css, controls, registry) {
	super(parent, x,y, css, controls, registry)
	this.klass = 'w-menu'
	this.conf = {		// holds promises
	    height: this.registry.get('MenuHeight', 19 * -15),
	    choosefont: this.registry.get_menu('MenuFont', 'F4FFFFFF0000000000000000000000009001000000000001030201225300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')
	}
    }

    async height(val) {
	return val ? this.conf.height = val * -15 : (await this.conf.height) / -15
    }
    async font(val) {
	return val ? this.conf.choosefont = val : new Logfont(await this.conf.choosefont)
    }

    async css_update() {
	let r = this.css.rule(`.${this.klass}__topitem`)
	let font = (await this.font()).css()
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
	this.css_update()
    }

    controls_activate() {
	$('#controls button').onclick = async () => {
	    let lf = (await this.font()).lf()
	    let r = await fetch(`/cgi-bin/choosefont?v=${lf}`)
		.then(fetcherr).then( r => r.text())
	    this.font(r)
	    this.controls_draw()
	}
	$('#controls input').onchange = el => {
	    this.height(el.target.value)
	    this.controls_draw()
	}
    }

    async controls_draw() {
	this.controls.innerHTML = `<h3>Menu</h3>
<p>Font: <button>${(await this.font()).button()}</button></p>
<p>Row height: <input type="number" min="0" max="50" value="${await this.height()}" step="1"> px</p>
`
	this.controls_activate()
	this.draw()
    }
}
