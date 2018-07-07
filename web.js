'use strict';

document.addEventListener('DOMContentLoaded', main)

async function main() {
    let registry = new Registry()
    await registry.load()
    let css = new CSS('css-global')
    let widgets = new Widgets()

    let factory = (klass, node) => {
	let w = new klass(node, $('#controls'), css, registry)
	widgets.add(w)
	w.node.onclick = function() {
	    widgets.select(w)
	}
	return w
    }

    let title = factory(Title, $('#notepad__title'))
    factory(Menu, $('#notepad__menu'))
    factory(Message, $('#message__text'))
    factory(StatusBar, $('#notepad__statusbar'))
    factory(Scrollbar, $('#notepad__scrollbar'))
    factory(Icons, $('#icons'))

    $('#message .w-title').onclick = function() { widgets.select(title) }
    widgets.redraw()
    widgets.select(title)

    $('#exit').onclick = async () => {
	if (widgets.is_modified()
	    && !confirm("You didn't press 'Save'. Still exit?")) return
	await efetch('/cgi-bin/exit').then( r => r.text())
	$('body').innerHTML = '<h1>The server has exited. Please close this tab.</h1>'
    }
    $('#save').onclick = async el => {
	el.target.disabled = true
	await registry.save()
	widgets.not_modified()
	el.target.disabled = false
	alert('You ought to logoff & logon again for the changes to take effect')
    }
    $('#reset').onclick = () => {
 	if (!confirm(`We can't reset to the real "defaults" for w10 has a diff set of the "defaults" for each DPI.

Reset to the values we've obtained during the program startup?`)) return
	registry.assign('cur', 'orig')
	widgets.redraw()
	widgets.cur.controls_draw()
    }
    $('#export').onclick = () => {
	efetch('/cgi-bin/registry/export').then( r => r.blob()).then( r => {
	    let url = URL.createObjectURL(r)
	    let a = document.createElement('a')
	    a.download = `winmetrics.${new Date().getTime()}.reg`
	    a.href = url
	    a.click()
	    URL.revokeObjectURL(url)
	})
    }
}

class Registry {
    constructor() {
	this.cur = {}
	this.orig = {}
	this.def = {
	    CaptionHeight: {
		val: 22 * -15,
		type: 'REG_SZ'
	    },
	    CaptionFont: {
		val: 'F4FFFFFF0000000000000000000000009001000000000001000005005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		type: 'REG_BINARY'
	    },
	    MenuHeight: {
		val: 19 * -15,
		type: 'REG_SZ'
	    },
	    MenuFont: {
		val: 'F4FFFFFF0000000000000000000000009001000000000001000005005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		type: 'REG_BINARY'
	    },
	    MessageFont: {
		val: 'F4FFFFFF0000000000000000000000009001000000000001000005005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		type: 'REG_BINARY'
	    },
	    StatusFont: {
		val: 'F4FFFFFF0000000000000000000000009001000000000001000005005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		type: 'REG_BINARY'
	    },
	    ScrollWidth: {
		val: 17 * -15,
		type: 'REG_SZ'
	    },
	    IconFont: {
		val: 'F4FFFFFF0000000000000000000000009001000000000001000005005300650067006F006500200055004900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		type: 'REG_BINARY'
	    },
	    IconSpacing: {
		val: 75 * -15,
		type: "REG_SZ"
	    },
	    IconVerticalSpacing: {
		val: 75 * -15,
		type: "REG_SZ"
	    }
	}
    }
    async load() {
	let reg = await efetch('/cgi-bin/registry/get').then( r => r.json())
	this.assign('cur', 'def')
	Object.assign(this.cur, reg)
	// filter out entries from this.cur that don't exist in this.def
	this.cur = Object.assign({}, ...Object.keys(this.cur).filter( k => {
	    return k in this.def
	}).map( k => ({[k]: this.cur[k]})))

	// resolve all *Font keys
	let fonts = Object.keys(this.cur).filter( k => k.match(/.+Font$/))
	await Promise.all(fonts.map( async k => {
	    this.cur[k].lf = new Logfont(await efetch(`/cgi-bin/logfont?v=${this.cur[k].val}`).then( r => r.text()))
	}))

	this.assign('orig', 'cur') // save the obtained values for the Reset btn
    }
    assign(dest, src) {
	this[dest] = {}
	Object.keys(this[src]).forEach( key => {
	    this[dest][key] = Object.assign({}, this[src][key])
	})
    }
    save() {
	let ndjson = Object.entries(this.cur)
	    .map( ([k,v]) => {
		return JSON.stringify({
		    key: k,
		    type: v.type,
		    val: v.val
		})
	    }).join`\n`
	return efetch('/cgi-bin/registry/set', {
	    method: 'put',
	    body: ndjson
	})
    }
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
    not_modified() { return this.list.forEach( v => v.is_modified = false) }
    redraw() { this.list.forEach( w => w.css_update()) }
}

function $(query) { return document.querySelector(query) }
Element.prototype.$ = function(query) { return this.querySelector(query) }

class Widget {
    constructor(node, node_controls, css, reg) {
	this.node = node
	this.node_controls = node_controls
	this.css = css
	this.reg = () => reg.cur

	this.is_modified = false
    }
    opt_num(name, new_value) {
	let o = this.reg()[name]
	// FIXME: is this DPI aware?
	return new_value ? o.val = new_value * -15 : o.val / -15
    }
    opt_font(name, new_value) {
	if (new_value) {
	    let lf = new Logfont(new_value)
	    this.reg()[name].val = lf.hex()
	    return this.reg()[name].lf = lf
	}
	return this.reg()[name].lf
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

class StatusBar extends Message {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-statusbar'
	this.h3 = 'Status bar'
	this.o_font = 'StatusFont'
    }
}

class Scrollbar extends Widget {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-scrollbar'
	this.h3 = 'Scrollbar'
    }
    css_update() {
	let r = this.css.rule(`.${this.klass}`)
	r.style.width = `${this.opt_num('ScrollWidth')}px`
    }
    controls_draw() {
	this.node_controls.innerHTML = `<h3>${this.h3}</h3>
<p>Width: <input type="number" min="3" max="200" value="${this.opt_num('ScrollWidth')}" step="1" size="4"> px</p>
`
	this.controls_activate()
    }
    controls_activate() {
	this.node_controls.$('input').oninput = el => {
	    this.opt_num('ScrollWidth', el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
    }
}

class Icons extends Title {
    constructor(node, node_controls, css, reg) {
	super(node, node_controls, css, reg)
	this.klass = 'w-icons'
	this.h3 = 'Icons'
	this.o_font = 'IconFont'
    }
    css_update() {
	this.css_update_font()

	let r = this.css.rule(`.${this.klass}__icon`)
	r.style.setProperty('--IconSpacing', `${this.opt_num('IconSpacing')}px`)
	r.style.setProperty('--IconVerticalSpacing', `${this.opt_num('IconVerticalSpacing')}px`)
    }
    controls_draw() {
	this.node_controls.innerHTML = `<h3>${this.h3}</h3>
<p>The rendering is rather approximate.</p>
<p>Font: <button>${(this.opt_font(this.o_font))}</button></p>
<p>Horizontal spacing: <input name="h_spacing" type="number" min="75" max="750" value="${this.opt_num('IconSpacing')}" step="1" size="4"> px</p>
<p>Vertical spacing: <input name="v_spacing" type="number" min="75" max="750" value="${this.opt_num('IconVerticalSpacing')}" step="1" size="4"> px</p>
`
	this.css_update()
	this.controls_activate()
    }
    controls_activate() {
	this.node_controls.$('button').onclick = el => {
	    this.controls_activate_font_button(el.target)
	}
	this.node_controls.$('input[name="h_spacing"]').oninput = el => {
	    this.opt_num('IconSpacing', el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
	this.node_controls.$('input[name="v_spacing"]').oninput = el => {
	    this.opt_num('IconVerticalSpacing', el.target.value)
	    this.css_update()
	    this.is_modified = true
	}
    }
}
