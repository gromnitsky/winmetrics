'use strict';

document.addEventListener('DOMContentLoaded', main)

async function main() {
    let reg = await reg_load()
    let css = new CSS('css-global')
    let widgets = new Widgets()

    let factory = (klass, node) => {
	let w = new klass(node, $('#controls'), css, reg)
	widgets.add(w)
	w.node.onclick = function() {
	    widgets.select(w)
	}
	return w
    }

    let title = factory(Title, $('#notepad__title'))
    factory(Menu, $('#notepad__menu'))
    factory(Message, $('#message__text'))

    widgets.redraw()
    widgets.select(title)

    $('#save').onclick = el => {
	console.log(reg)
    }
}

async function reg_load() {
    let reg = await efetch('/cgi-bin/registry/get').then( r => r.json())
    // resolve all *Font keys
    let fonts = Object.keys(reg).filter( k => k.match(/.+Font$/))
    await Promise.all(fonts.map( async k => {
	reg[k].lf = new Logfont(await efetch(`/cgi-bin/logfont?v=${reg[k].val}`).then( r => r.text()))
    }))
    return reg
}

function efetch(url, opt) {
    let fetcherr = r => {
	if (!r.ok) throw new Error(r.statusText)
	return r;
    }
    return fetch(url, opt).then(fetcherr)
}

class Logfont {
    constructor(choosefont_res) { this.cf = choosefont_res.trim().split(",") }
    hex() { return this.cf[0] }
    css() {
	return {
	    fontFamily: this.cf[1],
	    fontWeight: this.cf[2],
	    fontStyle: Number(this.cf[3]) ? 'italic' : 'normal',
	    fontSize: `${this.cf[4]}pt`,
	}
    }
    toString() { return `${this.cf[1]}, ${parseFloat(this.cf[4])}pt` }
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

class Widgets {
    constructor() {
	this.list = []
	this.cur = []
    }
    add(w) { this.list.push(w) }
    select(w) {
	w.controls_draw()
	this.cur = w
    }
    is_modified() { return this.list.some( v => v.is_modified) }
    redraw() { this.list.forEach( w => w.css_update()) }
}

function $(query) { return document.querySelector(query) }
Element.prototype.$ = function(query) { return this.querySelector(query) }

class Widget {
    constructor(node, node_controls, css, reg) {
	this.node = node
	this.node_controls = node_controls
	this.css = css
	this.reg = reg

	this.is_modified = false
    }
    opt_num(name, new_value) {
	let o = this.reg[name]
	// FIXME: is this DPI aware?
	return new_value ? o.val = new_value * -15 : o.val / -15
    }
    opt_font(name, new_value) {
	if (new_value) {
	    let lf = new Logfont(new_value)
	    this.reg[name].val = lf.hex()
	    return this.reg[name].lf = lf
	}
	return this.reg[name].lf
    }
    controls_draw() {}		// override it
    css_update_font() {
	let r = this.css.rule(`.${this.klass}__text`)
	let lf = this.opt_font(this.o_font)
	Object.assign(r.style, lf.css())
    }
}

class Title extends Widget {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-title'
	this.h3 = 'Title'
	this.o_font = 'CaptionFont'
	this.o_height = 'CaptionHeight'
    }
    css_update() {
	this.css_update_font()

	let r = this.css.rule(`.${this.klass}`)
	r.style.height = `${this.opt_num(this.o_height)}px`
    }
    controls_draw() {
	this.node_controls.innerHTML = `<h3>${this.h3}</h3>
<p>Font: <button>${this.opt_font(this.o_font)}</button></p>
<p>Row height: <input type="number" min="1" max="500" value="${this.opt_num(this.o_height)}" step="1" size="4"> px</p>
`
	this.controls_activate()
    }
    controls_activate() {
	this.node_controls.$('input').oninput = el => {
	    this.opt_num(this.o_height, el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
	this.node_controls.$('button').onclick = async el => {
	    await this.controls_activate_font_button(el.target)

	    let height = this.node.$(`.${this.klass}__text`).clientHeight
	    if (height > this.opt_num(this.o_height)) {
		this.node_controls.$('input').value = height
		event_trigger(this.node_controls.$('input'), 'input')
	    }
	}
    }
    async controls_activate_font_button(node) {
	let r = await efetch(`/cgi-bin/choosefont?v=${this.opt_font(this.o_font).hex()}`).then( r => r.text())
	this.opt_font(this.o_font, r)
	node.innerText = this.opt_font(this.o_font).toString()
	this.css_update()
	this.is_modified = true
    }
}

function event_trigger(node, event) {
    let e = new Event(event)
    node.dispatchEvent(e)
}

class Menu extends Title {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-menu'
	this.h3 = 'Menu'
	this.o_font = 'MenuFont'
	this.o_height = 'MenuHeight'
    }
}

class Message extends Title {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-message'
	this.h3 = 'Message text'
	this.o_font = 'MessageFont'
    }
    css_update() { this.css_update_font() }
    controls_draw() {
	this.node_controls.innerHTML = `<h3>${this.h3}</h3>
<p>Font: <button>${this.opt_font(this.o_font)}</button></p>
`
	this.controls_activate()
    }
    controls_activate() {
	this.node_controls.$('button').onclick = el => {
	    this.controls_activate_font_button(el.target)
	}
    }
}
