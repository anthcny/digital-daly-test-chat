const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');
const jwt = require('jsonwebtoken');
const {db} = require('./db');

const staticFolder = path.join(__dirname, 'static');
app.use(express.static(staticFolder));
app.get('*', function(req, res){
  res.sendFile(path.normalize(path.join(staticFolder, 'index.html')));
});

const activeUsers = { },
	isAlreadyActive = socket => !!activeUsers[socket.id],
	countActiveUsers = () => Object.values(activeUsers).length,
	countLoggedInUsers = () => {
		return Object.values(activeUsers).filter(u => u.loggedIn).length;
	}
	logActiveCount = () => console.log(`active users: ${countActiveUsers()}, loggedIn: ${countLoggedInUsers()}`),
	secretToken = 'secret',
	dbo = db.get(),
	getUser = socket => {
		userInfo = activeUsers[socket.id];
		console.log('userInfo', userInfo);
		return userInfo && userInfo.username;
	},
	getLastMsgFrom = from => {
		return from ? dbo.messages.filter(m => m.at > from) : dbo.messages;
	}

	setInterval(() => {
		db.save();
	}, 10000);

io.on('connection', function(socket){
	const emitChangeActiveUser = () => {
		const au = countLoggedInUsers();
		io.sockets.emit('users_count', au);
		logActiveCount();
	}
	if (isAlreadyActive(socket)) {
		activeUsers[socket.id].openTabs++;
	} else {
		activeUsers[socket.id] = {
			openTabs: 1,
			startAt: Date.now(),
			username: null,
			loggedIn: false,
		};
	}
	logActiveCount();
	socket.on('disconnect', (reason) => {
		const ot = --activeUsers[socket.id].openTabs;
		if (!ot)
			delete activeUsers[socket.id];
		
		logActiveCount();
	});
	socket.on('verify token', (token, cb) => {
		const res = jwt.verify(token, secretToken);
		cb(res);
		socket.emit('verify token result', res);
	});
	socket.on('logout', () => {
		socket.emit('logout');
		activeUsers[socket.id].loggedIn = false;
		socket.broadcast.emit('user out', { user: getUser(socket) });
		emitChangeActiveUser();
	});
	socket.on('login', (data, cb) => {
		data = data || {};
		const result = { result: false, token: null, reason: '' },
			eveFail = 'login failed', eveSucc = 'login success',
			loginUser = (username) => {
				result.token = jwt.sign({ user: username }, secretToken);
				result.result = true;
				activeUsers[socket.id].username = username;
				activeUsers[socket.id].loggedIn = true;
				cb(result);
				socket.emit(eveSucc, result);
				emitChangeActiveUser();
				socket.broadcast.emit('user in', { user: username });
			}
		try {
			if (data.token) {
				const res = jwt.verify(data.token, secretToken);
				console.log('verify token', res);
				if (res) {
					loginUser(res.user);
				} else {
					result.result = false;
					result.reason = 'invalid token';
					cb(result);
					socket.emit(eveFail, result);
				}
				return;
			}
			if (!data.user)
				throw new Error('empty login');

			if (dbo.users[data.user] === undefined) {
				dbo.users[data.user] = data.pass || '';
				db.save();
				loginUser(data.user);
			} else {
				if (dbo.users[data.user] === data.pass) {
					loginUser(data.user);
				} else {
					result.result = false;
					result.reason = 'user not found';
					cb(result);
					socket.emit(eveFail, result);
				}
			}
		} catch (e) {
			result.result = false;
			result.token = null;
			result.reason = e.message || e;
			cb(result);
			socket.emit(eveFail, result);
		}
	});
	socket.on('load chat data', (from) => {
		socket.emit('load chat data', {
			messages: getLastMsgFrom(from),
			currentUser: getUser(socket)
		});
	});
	socket.on('new message', data => {
		if (!data) return;
		data = data && data.trim();
		const user = getUser(socket);
		if (!user) return;
		const message = {
			body: data,
			at: Date.now(),
			from: user,
			id: dbo.messages.length
		};
		dbo.messages.push(message);
		console.log('new message', message);
		io.sockets.emit('new message', message);
	});
});

http.listen(process.env.PORT || 3000, function(){
  console.log('server listening on *:3000');
});