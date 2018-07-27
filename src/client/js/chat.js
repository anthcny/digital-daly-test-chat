import autosize from 'autosize';
import Vue from 'vue/dist/vue';
import {core, events} from './core';

export default Vue.component('chat', {
	template: '#chat-template',
	data() {
		return {
			activeUsers: 0,
			/**
			 * const message = {
					body: data,
					at: Date.now(),
					from: user,
					id: dbo.messages.length
				};
			 */
			messages: [],
			inputMessage: '',
		}
	},
	computed: {
    chatMessages: function () {
      return this.messages.sort((a,b) => a.at - b.at);
		},
		dialogEl: () => document.querySelector('.chat__dialog'),
	},
	updated() {
		this.dialogEl.scrollTop = this.dialogEl.scrollHeight
	},
	mounted() {
		this.subs = this.subs || [];
		this.subs.push(
			core.countUsers$.subscribe(count => {
				this.activeUsers = count;
			}),
			core.ofTypeEvent$(events.newMessage).subscribe(ev => {
				this.messages.push(ev.data);
			}),
			core.ofTypeEvent$(events.chatDataLoaded).subscribe(ev => {
				this.messages = ev.data.messages || [];
			})
		);
		const inputMsg = document.getElementById('message_input'),
				chatInputArea = document.querySelector('.chat__input'),
				msgArea = chatInputArea && chatInputArea.querySelector('.chat__input-msg');
		this.inputMsg = inputMsg;
		function adjustSizeInput() {
			if (!inputMsg
				&& !chatInputArea
				&& !msgArea)
				return;

			if (inputMsg.clientHeight > chatInputArea.clientHeight) {
				msgArea.style.height = `${chatInputArea.clientHeight}px`;
			} else {
				msgArea.style.height = `auto`;
			}
			inputMsg && autosize.update(inputMsg);
		}

		inputMsg && autosize(inputMsg);
		inputMsg && inputMsg.addEventListener('autosize:resized', adjustSizeInput);
		window.addEventListener('keyup', function (e) {
			switch(e.keyCode)
			{
					case 8: //backspace
					case 46: //delete
						adjustSizeInput();
						break;
					default:
						break;
			}
		});
		core.loadData();
	},
	beforeDestroy() {
		(this.subs || []).forEach(s => {
			s.unsubscribe && s.unsubscribe();
		});
	},
	methods: {
		sendMsg() {
			core.sendMessage(this.inputMessage);
			this.inputMessage = '';
			this.$nextTick(function () {
				this.inputMsg && autosize.update(this.inputMsg);
      });
		},
		logout() {
			core.logout();
		}
	}
});