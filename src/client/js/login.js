import Vue from 'vue/dist/vue';
import {core, events} from './core';
import { first } from 'rxjs/operators';

export default Vue.component('login', {
	template: '#login-template',
	data: () => ({
		username: '',
		password: '',
		error: ''
	}),
	methods: {
		onLogin(e) {
			e.preventDefault();
			this.actionsDiv && this.actionsDiv.classList.remove('error');
			core.login(this.username, this.password);
		},
	},
	computed: {
		actionsDiv: () => document.querySelector('.actions'),
	},
	created() {
		core.ofTypeEvent$(events.loginSuccess)
				.pipe(first())
				.subscribe(_ => {
					this.$router.push('chat');
				});
		this.subs = this.subs || [];
		this.subs.push(
			core.ofTypeEvent$(events.loginFailed)
				.subscribe(ev => {
					this.error = ev.data.reason;
					this.actionsDiv && this.actionsDiv.classList.add('error');
					setTimeout(() => {
						this.actionsDiv && this.actionsDiv.classList.remove('error');
					}, 3000);
				})
		);
	},
	beforeDestroy() {
		(this.subs || []).forEach(s => {
			s.unsubscribe && s.unsubscribe();
		});
	}
});