#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')
let child_process = require('child_process')
let path = require('path')
let fs = require('fs')

let mime = require('mime')

let run = function(name, args = [], stdin_input) {
    return new Promise( (resolve, reject) => {
	let cmd = child_process.spawn(name, args)

	cmd.on('error', err => {
	    reject(err)
	})

	let stdout = [], stderr = []
	cmd.stdout.on('data', chunk => {
	    stdout.push(chunk)
	})
	cmd.stderr.on('data', chunk => {
	    stderr.push(chunk)
	})
	cmd.on('exit', code => {
	    if (code !== 0)
		reject(new Error(`'${name}' exit code ${code}: ${stderr.join("")}`))
	    else
		resolve(stdout.join``)
	})

	if (stdin_input) {
	    cmd.stdin.write(stdin_input)
	    cmd.stdin.end()
	}
    })
}

let reg_parse = function(str) {
    return Object.assign({}, ...str.split("\n")
			 .filter( v => /^ {4}\w/.test(v))
			 .map( line => {
			     let chk = line.trim().split(/ {4}/)
			     return {
				 [chk[0]]: { type: chk[1], val: chk[2] }
			     }
			 }))
}


if (process.argv.length < 3) {
    console.error("Usage: server.js public_dir")
    process.exit(1)
}
process.chdir(process.argv[2])
let public_root = fs.realpathSync(process.cwd())

let server = http.createServer(async function (req, res) {
    let log = console.error.bind(console, `${req.url}:`, 'error:')
    let err = (code, msg) => {
	try { res.statusCode = code } catch (e) { log(code, e.message) }
	log(code, msg || '')
	res.end()
    }
    let run_safely = async (...args) => {
	try { return await run(...args) } catch (e) { err(500, e.message) }
    }

    let u = url.parse(req.url, true)
    if (req.method === "GET" && u.pathname === '/cgi-bin/exit') {
	log(0, 'cheerio')
	res.end()
	process.exit(0)
    } else if (req.method === "GET" && u.pathname === '/cgi-bin/registry/get') {
	let r = await run('reg', ['query', 'HKCU\\Control Panel\\Desktop\\WindowMetrics'])
	res.setHeader('Content-Type', 'application/json')
	res.end(JSON.stringify(reg_parse(r)))

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/choosefont') {
	res.setHeader('Content-Type', 'text/plain')
	let r = await run_safely('cgi-bin/choosefont', [], "FIXME")
	res.end(r)

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/dpi') {
	res.setHeader('Content-Type', 'text/plain')
	res.end(await run_safely('cgi-bin/dpi'))

    } else if (req.method === "GET" && !/^\/cgi-bin/.test(u.pathname)) {
	if (/^\/+$/.test(u.pathname)) u.pathname = '/index.html'
	let fname = path.join(public_root, path.normalize(u.pathname))

	fs.stat(fname, (e, stats) => {
	    if (e) {
		err(404, `${e.syscall} ${e.code}`)
		return
	    }
	    res.setHeader('Content-Length', stats.size)
	    res.setHeader('Content-Type', mime.getType(fname))
	    let stream = fs.createReadStream(fname)
	    stream.on('error', e => {
		err(500, `${err.syscall} ${e.code}`)
	    })
	    stream.pipe(res)
	})
    } else
	err(400)
})


server.listen(process.env.WINMETRICS_PORT || 8765, () => {
    let url = `http://127.0.0.1:${server.address().port}/`
    console.error(url)
    if (process.env.WINMETRICS_BROWSER) child_process.exec(`start ${url}`)
})
server.on('error', e => {
    console.error(`Error: ${e.message}`)
    process.exit(e.code === 'EADDRINUSE' ? 2 : 1)
})
