import * as plainDialogs from './vendor/node_modules/plain-dialogs/index.mjs'

document.addEventListener("DOMContentLoaded", function() {
    let widgets = []
    let is_modified = () => widgets.some( v => v.is_modified)

    $('#exit').onclick = async () => {
	if (is_modified()) {
	    if (!await plainDialogs.confirm2("You didn't press 'Save'. Still exit?")) return
	}
	fetch('/cgi-bin/exit').then(fetcherr).then( r => r.text()).then( () => {
	    document.querySelector('body').innerHTML = '<h1>Server has exited. Please close this tab.</h1>'
	})
	return false
    }
    $('#save').onclick = async (el) => {
	el.target.disabled = true
	await Promise.all(widgets.map( v => v.save()))
	el.target.disabled = false
    }

    let registry = new Registry()
    let menu = new Menu($('#notepad-menu'), 'css-global', $('#controls'),
			registry)
    widgets.push(menu)
    menu.controls_draw()
})

function fetcherr(res) {
    if (!res.ok) throw new Error(res.statusText)
    return res;
}

function $(query) { return document.querySelector(query) }
Element.prototype.$ = function(query) { return this.querySelector(query) }

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
}

class CSS {
    constructor(id) {
	this.node = Array.from(document.styleSheets)
	    .filter( v => v.ownerNode.id === id)[0]
    }
    rule(name) {
	return Array.from(this.node.cssRules)
	    .filter( v => v.selectorText === name)[0]
    }
}

class Widget {
    constructor(node, style_id, controls, registry) {
	this.node = node
	this.controls = controls
	this.css = new CSS(style_id)
	this.registry = registry

	this.conf = {}
	this.is_modified = false
    }

    async save() {
	let conf = Object.assign({}, this.conf)
	for (let key in conf) {
	    conf[key].val = await conf[key].val
	    // TODO
	    console.log('saving', key)
	}
	this.is_modified = false
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
	    size_points: this.cf[4],
	    size_pixels: this.cf[5]
	}
    }
    button() {
	return `${this.cf[1]}, ${parseFloat(this.cf[4])}pt, ${this.cf[5]}px`
    }
}

class Menu extends Widget {
    constructor(node_qs, style_qs, controls_qs, registry) {
	super(node_qs, style_qs, controls_qs, registry)
	this.klass = 'w-menu'
	this.conf = {
	    MenuHeight: {
		val: this.registry.get('MenuHeight', 19 * -15),
		type: 'REG_SZ'
	    },
	    MenuFont: {
		val: this.registry.get('MenuFont', 'F4FFFFFF0000000000000000000000009001000000000001030201225300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
		type: 'REG_BINARY'
	    }
	}
    }

    async height(val) {
	return val ? this.conf.MenuHeight.val = val * -15 : (await this.conf.MenuHeight.val) / -15
    }
    async font(cf) {
	if (cf) {
	    return this.conf.MenuFont.val = new Logfont(cf).lf()
	} else {
	    return new Logfont(await fetch(`/cgi-bin/logfont?v=${await this.conf.MenuFont.val}`).then(fetcherr).then( r => r.text()))
	}
    }

    async css_update() {
	let r = this.css.rule(`.${this.klass}__topitem`)
	let font = (await this.font()).css()
	r.style.fontFamily = font.name
	r.style.fontWeight = font.weight
	r.style.fontStyle = Number(font.italic) ? 'italic' : 'normal'
	r.style.fontSize = `${font.size_pixels}px`

	r = this.css.rule(`.${this.klass}`)
	r.style.height = `${await this.height()}px`
    }

    controls_activate() {
	this.controls.$('button').onclick = async () => {
	    let lf = (await this.font()).lf()
	    let r = await fetch(`/cgi-bin/choosefont?v=${lf}`)
		.then(fetcherr).then( r => r.text())
	    this.font(r)
	    this.controls.$('button').innerText = (await this.font()).button()
	    await this.css_update()

	    let menu_item_height = this.node.$('span').clientHeight
	    if (menu_item_height > await this.height()) {
		this.controls.$('input').value = menu_item_height
		event_trigger(this.controls.$('input'), 'change')
	    }

	    this.is_modified = true
	}
	this.controls.$('input').onchange = el => {
	    this.height(el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
    }

    async controls_draw() {
	this.controls.innerHTML = `<h3>Menu</h3>
<p>Font: <button>${(await this.font()).button()}</button></p>
<p>Row height: <input type="number" min="0" max="2000" value="${await this.height()}" step="1" size="4"> px</p>
`
	this.css_update()
	this.controls_activate()
    }
}

function event_trigger(node, event) {
    let e = new Event(event)
    node.dispatchEvent(e)
}
