import autosize from 'autosize';
import VueRouter from 'vue-router';
import Vue from 'vue/dist/vue';
import VueTimeago from 'vue-timeago'
import Chat from './chat';
import Login from './login';
import {core, events} from './core';

export default () => {
	Vue.use(VueRouter);
	Vue.use(VueTimeago, {
		name: 'Timeago',
	})

	const router = new VueRouter({
		routes: [
			{ 
				path: '/chat',
				component: Chat,
				beforeEnter: (to, from, next) => {
					core.isAuth().then(isauth => {
						if (isauth) {
							next();
						} else {
							next('/login');
						}
					}).catch(err => {
						next('/login');
					});
				}
			},
			{ 
				path: '/login',
				component: Login
			},
			{ path: '*', redirect: '/chat' },
		]
	});

	core.ofTypeEvent$(events.logout).subscribe(_ => {
		router.push('/login');
	});

	const app = new Vue({
		router
	}).$mount('#vue-app');
}