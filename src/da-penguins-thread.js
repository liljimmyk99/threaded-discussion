/* eslint-disable eqeqeq */
// dependencies / things imported
import { LitElement, html, css} from 'lit';
import '@lrnwebcomponents/simple-icon/lib/simple-icons.js';
import '@lrnwebcomponents/simple-icon/lib/simple-icon-lite.js';
import '@lrnwebcomponents/simple-colors';

import './da-penguins-comment.js';
import sjcl from 'sjcl';
import 'jwt-auth-component';

export class DaPenguinsThread extends LitElement {
  static get tag() {
    return 'da-penguins-thread';
  }
  
  static get styles() {
    return css`

      :host {
        font-family: 'Open Sans', sans-serif;
        font-size: 18px;
        color: black;
        --accent-color-dark: #6A8A93;
        --accent-color-med: #889BA3;
        --accent-color-light-1: #aababc;
        --accent-color-light-2: #E8E2DE;
        --accent-color-light-3: var(--simple-colors-default-theme-accent-3);
        --accent-color-white: var(--simple-colors-default-theme-accent-2);
      }

      #Auth {
        margin: 10px;
      }

      #dialog-window {
        height: 500px;
        width: 575px;
        border: 2px var(--accent-color-dark) solid;
        background-color: var(--accent-color-white);
        border-radius: 10px;
        padding: 5px 0px;
      }

      #scrollable-content {
        height: 500px;
        overflow: auto;
      }

      .entire-thread {
        margin: 0px;
        padding: 0px;
        
      }

      .command-center {
        padding: 10px;
        margin: 10px;
        border-radius: 5px;
      }

      .create-comment {
        background-color: var(--accent-color-light-1);
        color: var(--accent-color-light-2);
        text-align: center;
        border: none;
        border-radius: 10px;
        padding: 15px 20px;
        font-size: 16px;
        margin: 4px 2px;
        cursor: pointer;
      }

      .create-comment:hover,
      .create-comment:focus,
      .create-comment:active {
        box-shadow: 0px 0px 2px var(--accent-color-dark);
      }

      .submit-button:disabled {
        background-color: lightgrey !important;
        color: darkgrey !important;
        pointer-events: none;
      }

      .submit-button {
        background-color: var(--accent-color-dark);
        color: var(--accent-color-light-2);
      }

      .new-comment-pane-visible {
        visibility: visible;
        background-color: var(--accent-color-light-3);
        padding: 20px;
        border: 1px solid var(--accent-color-med);
        margin: 20px 10px;
        width: fit-content;
        border-radius: 5px;
        font-family: 'Open Sans', sans-serif;
      }

      .new-comment-pane-visible .comment-prompt {
        margin: 0px;
        color: var(--accent-color-dark);
        font-size: 16px;
      }

      .new-comment-pane-visible .submit-body {
        border: solid 1px var(--accent-color-med);
        border-radius: 5px;
        background-color: var(--accent-color-white);
        resize: none;
        outline: none;
        width: 400px;
        height: 125px;
        font-family: 'Open Sans', sans-serif;
        color: var(--accent-color-dark);
        padding: 10px;
        margin: 10px 0px;
      }

      .submit-body:hover,
      .submit-body:focus,
      .submit-body:active {
        box-shadow: 0px 0px 2px darkslategrey;
      }

      .new-comment-pane-hidden {
        visibility: hidden;
        height: 0px;
      }

      .is-reply {
        margin-left: 30px;
        margin-top: -10px;
        transform: scale(0.9);
      }

      @media (max-width: 550px) {
          .rendered-comment {
            transform: scale(0.8);
            margin: -8% -10% -12% -10%;
          }

          .is-reply {
            transform: scale(0.7);
            margin: -16% -4%;
          }

          .new-comment-pane-visible {
            transform: scale(.8);
            margin: -6%;
          }

          #dialog-window {
            width: calc(575px * .8);
          }

        }
    `;
  }

  constructor() {
    super();
    if (!this.threadID){
      this.threadID = undefined;
    }
    this.threadEnabled = false;
    this.threadPermissions = null;
    this.commentList = [];

    // Auth wall
    this.addEventListener('auth-success', this.authsucks);
    // listen to deleted events for re-render
    // Issue: commentId undefined.
    this.addEventListener('comment-deleted', (e) => {
      console.log("delete event received", e.detail.commentId);
      // console.log(this.commentList)
      for (const commentThread of this.commentList){
        // console.log(commentThread);
        for (const comment of commentThread){
          if (comment.uid == e.detail.commentId){
            console.log("comment identified");
            console.log(comment);
            const threadIndex = this.commentList.indexOf(commentThread);
            const commentIndex = this.commentList[threadIndex].indexOf(comment);
            this.commentList[threadIndex].splice(commentIndex, commentIndex+1);
            if (this.commentList[threadIndex].length === 0 || commentIndex === 0){
              this.commentList.splice(threadIndex, threadIndex+1);
            }
            console.log(this.commentList);
            const newCommentList = this.commentList;
            this.commentList = undefined;
            this.commentList = newCommentList;

          }
        }
      }
    });
    // Listen for new comment replies
    this.addEventListener('reply-created', this.refreshCommentList);
  }

  static get properties() {
    return {
      ...super.properties,
      threadID: { type: String, reflect: true, attribute: "uid"},
      threadEnabled: { type: Boolean },
      threadPermissions: { type: String },
      commentList: { type: Array },
    };
  }

  // BACKEND TIE-INS (auth and threading)
  async authsucks() {
    this.commentList = await this.getAllComments();
    this.threadEnabled = true;
  }

  async refreshCommentList() {
    console.log("reply created, refreshing now...");
    this.commentList = await this.getAllComments();
  }

  // eslint-disable-next-line class-methods-use-this
  getThreadID() {
    // the thread id is the current page hash
    if (window.location.host === 'localhost:3000') {
      return '1234';
    }
    const currentPage = window.location.href;
    const hashBits = sjcl.hash.sha256.hash(currentPage);
    return sjcl.codec.hex.fromBits(hashBits);
  }

  async fetchThreadData() {
    const apiOrigin = window.location.origin;
    const apiURL = new URL('/api/get-thread/', apiOrigin);
    apiURL.searchParams.append('uid', this.threadID);
    await fetch(apiURL)
      .then(res => res.json())
      .then(data => {
        this.threadPermissions = data.permissions;
      });
  }

  // CALLBACK FUNCTIONS
  firstUpdated(changedProperties) {
    if (super.firstUpdated) {
      super.firstUpdated(changedProperties);
    }
  }

  updated(changedProperties) {
    if (super.updated){
      super.updated(changedProperties);
    }
    changedProperties.forEach((oldValue, propName) => {
      if (propName === 'commentList' && this[propName]){
        console.log("comment list update wow");
      }
    });
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.threadPermissions == null) {
      this.fetchThreadData();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  // API CALLS

  // eslint-disable-next-line class-methods-use-this
  async createUser(){
    const response = await fetch('/api/create-user', {
      method: 'POST',
      body: JSON.stringify({
        name: "Jimmy",
         is_admin: false,
      }),
      headers: {
        Authorization: `Bearer ${window.localStorage.getItem('comment-jwt')}`
      }
    }).then(res => res.json());
    console.log(response);
  }

  // eslint-disable-next-line class-methods-use-this
  async createComment(commentBody){
    const response = await fetch('/api/submit-comment', {
      method: 'POST',
      headers: { Authorization: `Bearer ${window.localStorage.getItem('comment-jwt')}` },
      body: JSON.stringify({
        thread_uid: this.threadID,
        body: commentBody,
        is_reply: false
     })
    }).then(res => res.json());
    console.log(response);
    return response;
  }

  // eslint-disable-next-line class-methods-use-this
  async getAllComments() {
    // TODO: make query into URL object
    const response = await fetch(`/api/get-comment?threadId=${this.threadID}`, {headers: {
      Authorization: `Bearer ${window.localStorage.getItem('comment-jwt')}`
    }}).then(res => res.json()).catch( e => undefined);
    console.log(response);
    return response;
  }

  // eslint-disable-next-line class-methods-use-this
  async getSpecificComment(targetUID){
    const response = await fetch(`/api/get-comment?uid=${targetUID}`, {headers: {
      Authorization: `Bearer ${window.localStorage.getItem('comment-jwt')}`
    }}).then(res => res.json());
    console.log(targetUID ," ", response);
    return response;
  }

  renderComment(comment) {    
    const isEdited = comment.is_edited != '0';
    const isReply= comment.is_reply != '0';

    const submittedTime = new Date(comment.submitted_time).toLocaleString();

    let editedTime = '';
    if(isEdited){
      editedTime = new Date(comment.edited_time).toLocaleString();
    }
    if(comment.is_deleted == '0'){
      return html`
        <da-penguins-comment
          UID=${comment.uid}
          userUID=${comment.user_uid}
          username=${comment.name}
          submittedTime=${submittedTime}
          body=${comment.body}
          editedTime=${editedTime}
          ?isEdited=${isEdited}
          ?isReply=${isReply}
          replyTo=${comment.reply_to}
          likes=${comment.likes}
          threadID=${this.threadID}
          class="rendered-comment ${isReply ? 'is-reply' : ''}"
        ></da-penguins-comment>
      `;
    }
    return html``;
  }

  async initiateCreateComment(){
    const commentBody = this.shadowRoot.querySelector(".submit-body");
    if (commentBody.value.trim() !== ''){
      const newComment = await this.createComment(commentBody.value);
      commentBody.value = '';
      this.commentList = await this.getAllComments();
    }
    this.hideNewCommentPane();
  }

  validateSubmitButton(){
    console.log("NEW INPUT");
    const submitButton = this.shadowRoot.querySelector(".submit-button");
    const commentBody = this.shadowRoot.querySelector(".submit-body");
    if (commentBody.value.trim() == ''){
      console.log(commentBody.value);
      submitButton.disabled = true;
    } else {
      submitButton.disabled = false;
    }
  }

  showCommentPane(){
    this.shadowRoot.querySelector('.new-comment-pane-hidden').classList.add('new-comment-pane-visible');
    this.shadowRoot.querySelector('.new-comment-pane-visible').classList.remove('new-comment-pane-hidden');
  }

  hideNewCommentPane(){
    this.shadowRoot.querySelector('.new-comment-pane-visible').classList.add('new-comment-pane-hidden');
    this.shadowRoot.querySelector('.new-comment-pane-hidden').classList.remove('new-comment-pane-visible');

  }

  cancelComment(){
    this.hideNewCommentPane();
    this.shadowRoot.querySelector('.submit-body').value = "";
    this.validateSubmitButton();
  }

  querySpecificComment(){
    const uid = prompt("Enter the comment's UID here and view it's return in the console: ", "UID");
    console.log(this.getSpecificComment(uid));
  }

  render() {
    if (!this.threadEnabled) {
      // TODO: add different cases for various thread permissions
      return html`
        <div class="center" id="Auth">
          <h2>Login to See the Comments!</h2>
          <jwt-auth authendpoint="/api/auth/"></jwt-auth>
        </div>
      `;
    }
    if (this.threadID == undefined || this.commentList == undefined){
      return html`
      <div class="center">
        <p>There was an error loading the thread.</p>
      </div>
      ;`
    }
    console.log("all comments: ", this.commentList);
    return html`
      <div id="dialog-window">
        <div class="entire-thread" id="scrollable-content">
          <div class="command-center">
            <button class="create-comment" @click=${this.showCommentPane}> <simple-icon-lite icon="add"></simple-icon-lite><div>Add Comment</div></button>
          </div>
          <div class="new-comment-pane-hidden">
            <p class="comment-prompt"> Have Something to Say? Leave a Comment Below! </p>
            <textarea class="submit-body" @input=${this.validateSubmitButton} ></textarea>
            <div class="comment-pane-buttons">
              <button class="create-comment" @click=${this.cancelComment}>Cancel</button>
              <button class="create-comment submit-button" @click="${this.initiateCreateComment}" disabled>Submit</button>
            </div>
          </div>
          <div class="rendered-comments">
            ${this.commentList.map(commentArray => commentArray.map(comment => html` ${this.renderComment(comment)} `) )}
          </div>
        </div>
      </div>
    `;
    
  }


  // HAX specific callback
  // This teaches HAX how to edit and work with your web component
  /**
   * haxProperties integration via file reference
   */
  static get haxProperties() {
    return new URL(`../lib/FlashCard.haxProperties.json`, import.meta.url).href;
  }
}
customElements.define(DaPenguinsThread.tag, DaPenguinsThread);
