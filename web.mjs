import * as plainDialogs from './vendor/node_modules/plain-dialogs/index.mjs'

document.addEventListener("DOMContentLoaded", function() {
    draw_dpi()

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
    let menu = new Menu($('#notepad__menu'), 'css-global', $('#controls'),
			registry)
    widgets.push(menu)
    let title = new Title($('#notepad__title'), 'css-global', $('#controls'),
			  registry)
    widgets.push(title)
    let msg = new Message($('#message__text'), 'css-global', $('#controls'),
			  registry)
    widgets.push(msg)
    let statusbar = new StatusBar($('#notepad__statusbar'),
				  'css-global', $('#controls'), registry)
    widgets.push(statusbar)
    let scrollbar = new Scrollbar($('#notepad__scrollbar'),
				  'css-global', $('#controls'), registry)
    widgets.push(scrollbar)

    widgets.forEach( w => {
	w.css_update()
	w.node.onclick = function() {
	    w.controls_draw()
	}
    })
    $('#message .w-title').onclick = function() { title.controls_draw() }

    title.controls_draw()
})

function dpi() { // https://stackoverflow.com/a/35941703
    function findFirstPositive(b, a, i, c) {
	c=(d,e)=>e>=d?(a=d+(e-d)/2,0<b(a)&&(a==d||0>=b(a-1))?a:0>=b(a)?c(a+1,e):c(d,a-1)):-1
	for (i = 1; 0 >= b(i);) i *= 2
	return c(i / 2, i)|0
    }
    return findFirstPositive(x => matchMedia(`(max-resolution: ${x}dpi)`).matches)
}

function draw_dpi() {
    $('#dpi-browser').innerText = dpi()
    fetch('/cgi-bin/dpi').then(fetcherr)
	.then( r => r.text()).then( r => $('#dpi-windows').innerText = r)
}

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
	this.controls_title = "Menu"
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
	let key = Object.keys(this.conf).filter( k => /Height$/.test(k))
	let opt = this.conf[key]
	return val ? opt.val = val * -15 : (await opt.val) / -15
    }
    async font(cf) {
	let key = Object.keys(this.conf).filter( k => /Font$/.test(k))
	let opt = this.conf[key]
	if (cf) {
	    return opt.val = new Logfont(cf).lf()
	} else {
	    return new Logfont(await fetch(`/cgi-bin/logfont?v=${await opt.val}`).then(fetcherr).then( r => r.text()))
	}
    }

    async css_update_font() {
	let r = this.css.rule(`.${this.klass}__text`)
	let font = (await this.font()).css()
	r.style.fontFamily = font.name
	r.style.fontWeight = font.weight
	r.style.fontStyle = Number(font.italic) ? 'italic' : 'normal'
	r.style.fontSize = `${font.size_pixels}px`
    }

    async css_update() {
	await this.css_update_font()

	let r = this.css.rule(`.${this.klass}`)
	r.style.height = `${await this.height()}px`
    }

    async controls_activate_button(node) {
	let lf = (await this.font()).lf()
	let r = await fetch(`/cgi-bin/choosefont?v=${lf}`) // ask an user
	    .then(fetcherr).then( r => r.text())
	this.font(r)
	node.innerText = (await this.font()).button()
	await this.css_update()
	this.is_modified = true
    }

    controls_activate() {
	this.controls.$('button').onclick = async (el) => {
	    await this.controls_activate_button(el.target)

	    let menu_item_height = this.node.$(`.${this.klass}__text`).clientHeight
	    if (menu_item_height > await this.height()) {
		this.controls.$('input').value = menu_item_height
		event_trigger(this.controls.$('input'), 'change')
	    }
	}
	this.controls.$('input').onchange = el => {
	    this.height(el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
    }

    async controls_draw() {
	this.controls.innerHTML = `<h3>${this.controls_title}</h3>
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

class Title extends Menu {
    constructor(node_qs, style_qs, controls_qs, registry) {
	super(node_qs, style_qs, controls_qs, registry)
	this.klass = 'w-title'
	this.controls_title = "Title"
	this.conf = {
	    CaptionHeight: {
		val: this.registry.get('CaptionHeight', 22 * -15),
		type: 'REG_SZ'
	    },
	    CaptionFont: {
		val: this.registry.get('CaptionFont', 'F1FFFFFF0000000000000000000000009001000000000001000000005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
		type: 'REG_BINARY'
	    }
	}
    }
}

class Message extends Menu {
    constructor(node_qs, style_qs, controls_qs, registry) {
	super(node_qs, style_qs, controls_qs, registry)
	this.klass = 'w-message'
	this.controls_title = "Message text"
	this.conf = {
	    MessageFont: {
		val: this.registry.get('MessageFont', 'F1FFFFFF0000000000000000000000009001000000000001000000005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
		type: 'REG_BINARY'
	    }
	}
    }
    async css_update() {
	this.css_update_font()
    }
    controls_activate() {
	this.controls.$('button').onclick = (el) => {
	    this.controls_activate_button(el.target)
	}
    }
    async controls_draw() {
	this.controls.innerHTML = `<h3>${this.controls_title}</h3>
<p>Font: <button>${(await this.font()).button()}</button></p>
`
	this.css_update()
	this.controls_activate()
    }
}

class StatusBar extends Message {
    constructor(node_qs, style_qs, controls_qs, registry) {
	super(node_qs, style_qs, controls_qs, registry)
	this.klass = 'w-statusbar'
	this.controls_title = "Status bar"
	this.conf = {
	    StatusFont: {
		val: this.registry.get('StatusFont', 'F1FFFFFF0000000000000000000000009001000000000001000000005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
		type: 'REG_BINARY'
	    }
	}
    }
}

class Scrollbar extends Widget {
    constructor(node_qs, style_qs, controls_qs, registry) {
	super(node_qs, style_qs, controls_qs, registry)
	this.klass = 'w-scrollbar'
	this.controls_title = "Scrollbar"
	this.conf = {
	    ScrollWidth: {
		val: this.registry.get('ScrollWidth', 17 * -15),
		type: 'REG_SZ'
	    }
	}
    }

    async width(val) {
	return val ? this.conf.ScrollWidth.val = val * -15 : (await this.conf.ScrollWidth.val) / -15
    }

    async css_update() {
	let r = this.css.rule(`.${this.klass}`)
	r.style.width = `${await this.width()}px`
    }

    controls_activate() {
	this.controls.$('input').onchange = el => {
	    this.width(el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
    }

    async controls_draw() {
	this.controls.innerHTML = `<h3>${this.controls_title}</h3>
<p>Width: <input type="number" min="1" max="200" value="${await this.width()}" step="1" size="4"> px</p>
`
	this.css_update()
	this.controls_activate()
    }
}
