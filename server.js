#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')
let child_process = require('child_process')
let path = require('path')
let fs = require('fs')
let {pipeline} = require('stream')
let os = require('os')

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

let reg_add = async function(query) {
    query = JSON.parse(query)
    return run('reg', ['add', 'HKCU\\Control Panel\\Desktop\\WindowMetrics',
		       '/f',
		       '/v', query.key, '/t', query.type, '/d', query.val])
}


if (process.argv.length < 3) {
    console.error("Usage: server.js public_dir")
    process.exit(1)
}
process.chdir(process.argv[2])
let public_root = fs.realpathSync(process.cwd())

let server = http.createServer(async function (req, res) {
    let log = console.error.bind(console, `${req.method} ${req.url}:`)
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
	res.end('cheerio', () => {
	    log('finito')
	    setTimeout(() => { process.exit(0) }, 1)
	})

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/registry/get') {
	let r = await run_safely('reg', ['query', 'HKCU\\Control Panel\\Desktop\\WindowMetrics'])
	if (!r) return
	res.setHeader('Content-Type', 'application/json')
	res.end(JSON.stringify(reg_parse(r)))

    } else if (req.method === "GET"
	       && u.pathname === '/cgi-bin/registry/export') {
	let tmp = path.join(os.tmpdir(), `winmetrics-${Math.random()}`)
	let r = await run_safely('reg', ['export', 'HKCU\\Control Panel\\Desktop\\WindowMetrics', tmp, '/y'])
	if (!r) return
	res.setHeader('Content-Type', 'application/octet-stream')
	pipeline(fs.createReadStream(tmp), res, e => {
	    fs.unlink(tmp, e => {})
	})

    } else if (req.method === "PUT" && u.pathname === '/cgi-bin/registry/set') {
	// expect application/x-ndjson
	let data = []
	req.on('data', chunk => data.push(chunk))
	req.on('error', e => err(500, e.message))
	req.on('end', () => {
	    // wait for all registry writes, only then respond
	    Promise.all(data.join('').split("\n").map( line => reg_add(line)))
		.then( () => res.end())
		.catch( e => err(500, e.message))
	})

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/choosefont') {
	if (u.query.v) {
	    res.setHeader('Content-Type', 'text/plain')
	    res.end(await run_safely('cgi-bin/choosefont', [], u.query.v))
	} else
	    err(400)

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/logfont') {
	if (u.query.v) {
	    res.setHeader('Content-Type', 'text/plain')
	    res.end(await run_safely('cgi-bin/choosefont', [u.query.v]))
	} else
	    err(400)

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/dpi') {
	res.setHeader('Content-Type', 'text/plain')
	res.end(await run_safely('cgi-bin/dpi'))

    } else if (req.method === "GET" && u.pathname === '/cgi-bin/meta') {
	res.setHeader('Content-Type', 'application/json')
	res.end(JSON.stringify(require('./package')))

    } else if (req.method === "GET" && !/^\/cgi-bin/.test(u.pathname)) {
	if (/^\/+$/.test(u.pathname)) u.pathname = '/index.html'
	let fname = path.join(public_root, 'client', path.normalize(u.pathname))

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
