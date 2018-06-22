#!/usr/bin/env node

'use strict';

let http = require('http')
let url = require('url')
let {spawn} = require('child_process')
let util = require('util')

let run = function(name, args, stdin_input) {
    return new Promise( (resolve, reject) => {
	let cmd = spawn(name, args)

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
    if (req.method === "GET" && u.pathname === '/cgi-bin/registry/get') {
	let r = await run('reg', ['query', 'HKCU\\Control Panel\\Desktop\\WindowMetrics'])
	res.end(JSON.stringify(reg_parse(r)))
    } else if (req.method === "GET" && u.pathname === '/cgi-bin/choosefont') {
	let r = await run_safely('winmetrics', [], "FIXME")
	res.end(r)
    } else
	err(400)
})


server.listen(process.env.WINMETRICS_PORT || 8765)
