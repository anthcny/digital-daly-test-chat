import {Subject, BehaviorSubject} from 'rxjs';
import {filter, tap} from 'rxjs/operators';

export const events = {
	loginSuccess: 'login success',
	loginFailed: 'login failed',
	newMessage: 'new message',
	newUser: 'new user',
	startType: 'start type',
	endType: 'end type',
	loadMessages: 'load messages',
	countUsers: 'count users',
	logout: 'logout',
	chatDataLoaded: 'chat data loaded'
}

const createEvent = (type, data) => {
	return { type, data };
}

const tokenStore = {
	_key: 'token',
	get() {
		return localStorage.getItem(this._key)
	},
	set(token) {
		localStorage.setItem(this._key, token);
	}
}
const messageStore = {
	_key: 'messages',
	get() {
		return JSON.parse(localStorage.getItem(this._key));
	},
	set(messages) {
		localStorage.setItem(this._key, JSON.stringify(messages));
	}
}

export class ChatCore {
	get currentUser() {
		return this._currentUser;
	}
	constructor() {
		this._initStreams();
	}

	_initStreams() {
		this._stream$ = new Subject();
		this._countUsers$ = new BehaviorSubject(0);
		this._io = io && io() || {};
		this._io.on('users_count', count => {
			this._countUsers$.next(count);
		});
		this._io.on('logout', () => {
			this._stream$.next(createEvent(events.logout))
		});
		this._io.on('load chat data', data => {
			this._currentUser = data.currentUser;
			this._stream$.next(createEvent(events.chatDataLoaded, data));
		});
		this._io.on('new message', (msg) => {
			this._stream$.next(createEvent(events.newMessage, msg))
		});
	}

	get countUsers$() {
		return this._countUsers$.asObservable();
	}

	ofTypeEvent$(event) {
		return this._stream$.pipe(
			filter(ev => ev.type === event),
			tap(ev => console.log(ev))
		);
	}

	login(user, pass, token, cb) {
		this._io.emit('login', {user, pass, token}, res => {
			if (res.result) {
				tokenStore.set(res.token);
				cb && cb(true, res.token);
				this._stream$.next({
					type: events.loginSuccess,
					data: {
						token: res.token
					}
				});
			} else {
				cb && cb(false, res.reason)
				this._stream$.next({
					type: events.loginFailed,
					data: {
						reason: res.reason
					}
				});
			}
		})
	}

	logout() {
		tokenStore.set(null);
		this._io.emit('logout');
	}

	isAuth() {
		return new Promise((res, rej) => {
			const token = tokenStore.get();
			if (!token)
				res(false);
			else {
				// this._io.emit('verify token', token, res);
				this.login(null, null, token, (ok, err) => {
					if (!ok) rej(err);
					else res(true);
				});
			}
		});
	}

	sendMessage(msg) {
		msg && this._io.emit('new message', msg);
	}

	loadData() {
		this._io.emit('load chat data');
	}

	showError(err) {
		alert(err);
	}
}

export const core = new ChatCore();
export default core;
