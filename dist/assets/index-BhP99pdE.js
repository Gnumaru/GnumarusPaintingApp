(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=globalThis,t=e.ShadowRoot&&(e.ShadyCSS===void 0||e.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,n=Symbol(),r=new WeakMap,i=class{constructor(e,t,r){if(this._$cssResult$=!0,r!==n)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,n=this.t;if(t&&e===void 0){let t=n!==void 0&&n.length===1;t&&(e=r.get(n)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),t&&r.set(n,e))}return e}toString(){return this.cssText}},a=e=>new i(typeof e==`string`?e:e+``,void 0,n),o=(e,...t)=>new i(e.length===1?e[0]:t.reduce((t,n,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if(typeof e==`number`)return e;throw Error(`Value passed to 'css' function must be a 'css' function result: `+e+`. Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.`)})(n)+e[r+1],e[0]),e,n),s=(n,r)=>{if(t)n.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let t of r){let r=document.createElement(`style`),i=e.litNonce;i!==void 0&&r.setAttribute(`nonce`,i),r.textContent=t.cssText,n.appendChild(r)}},c=t?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return a(t)})(e):e,{is:l,defineProperty:u,getOwnPropertyDescriptor:d,getOwnPropertyNames:f,getOwnPropertySymbols:p,getPrototypeOf:m}=Object,h=globalThis,g=h.trustedTypes,_=g?g.emptyScript:``,v=h.reactiveElementPolyfillSupport,y=(e,t)=>e,b={toAttribute(e,t){switch(t){case Boolean:e=e?_:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},x=(e,t)=>!l(e,t),S={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:x};Symbol.metadata??=Symbol(`metadata`),h.litPropertyMetadata??=new WeakMap;var C=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=S){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&u(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??S}static _$Ei(){if(this.hasOwnProperty(y(`elementProperties`)))return;let e=m(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(y(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(y(`properties`))){let e=this.properties,t=[...f(e),...p(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(c(e))}else e!==void 0&&t.push(c(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return s(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?b:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?b:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??x)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};C.elementStyles=[],C.shadowRootOptions={mode:`open`},C[y(`elementProperties`)]=new Map,C[y(`finalized`)]=new Map,v?.({ReactiveElement:C}),(h.reactiveElementVersions??=[]).push(`2.1.2`);var w=globalThis,T=e=>e,E=w.trustedTypes,D=E?E.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,O=`$lit$`,k=`lit$${Math.random().toFixed(9).slice(2)}$`,A=`?`+k,j=`<${A}>`,M=document,N=()=>M.createComment(``),P=e=>e===null||typeof e!=`object`&&typeof e!=`function`,ee=Array.isArray,F=e=>ee(e)||typeof e?.[Symbol.iterator]==`function`,te=`[ 	
\f\r]`,ne=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,re=/-->/g,ie=/>/g,I=RegExp(`>|${te}(?:([^\\s"'>=/]+)(${te}*=${te}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),ae=/'/g,oe=/"/g,se=/^(?:script|style|textarea|title)$/i,L=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),ce=Symbol.for(`lit-noChange`),R=Symbol.for(`lit-nothing`),le=new WeakMap,ue=M.createTreeWalker(M,129);function de(e,t){if(!ee(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return D===void 0?t:D.createHTML(t)}var fe=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=ne;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===ne?c[1]===`!--`?o=re:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=I):(se.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=I):o=ie:o===I?c[0]===`>`?(o=i??ne,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?I:c[3]===`"`?oe:ae):o===oe||o===ae?o=I:o===re||o===ie?o=ne:(o=I,i=void 0);let d=o===I&&e[t+1].startsWith(`/>`)?` `:``;a+=o===ne?n+j:l>=0?(r.push(s),n.slice(0,l)+O+n.slice(l)+k+d):n+k+(l===-2?t:d)}return[de(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]},pe=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=fe(t,n);if(this.el=e.createElement(l,r),ue.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=ue.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(O)){let t=u[o++],n=i.getAttribute(e).split(k),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?ve:r[1]===`?`?ye:r[1]===`@`?z:_e}),i.removeAttribute(e)}else e.startsWith(k)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(se.test(i.tagName)){let e=i.textContent.split(k),t=e.length-1;if(t>0){i.textContent=E?E.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],N()),ue.nextNode(),c.push({type:2,index:++a});i.append(e[t],N())}}}else if(i.nodeType===8){if(i.data===A)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(k,e+1))!==-1;)c.push({type:7,index:a}),e+=k.length-1}}a++}}static createElement(e,t){let n=M.createElement(`template`);return n.innerHTML=e,n}};function me(e,t,n=e,r){if(t===ce)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=P(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=me(e,i._$AS(e,t.values),i,r)),t}var he=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??M).importNode(t,!0);ue.currentNode=r;let i=ue.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new ge(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new be(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=ue.nextNode(),a++)}return ue.currentNode=M,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},ge=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=R,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=me(this,e,t),P(e)?e===R||e==null||e===``?(this._$AH!==R&&this._$AR(),this._$AH=R):e!==this._$AH&&e!==ce&&this._(e):e._$litType$===void 0?e.nodeType===void 0?F(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==R&&P(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=pe.createElement(de(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new he(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=le.get(e.strings);return t===void 0&&le.set(e.strings,t=new pe(e)),t}k(t){ee(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(N()),this.O(N()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=T(e).nextSibling;T(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},_e=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=R,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=R}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=me(this,e,t,0),a=!P(e)||e!==this._$AH&&e!==ce,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=me(this,r[n+o],t,o),s===ce&&(s=this._$AH[o]),a||=!P(s)||s!==this._$AH[o],s===R?e=R:e!==R&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===R?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},ve=class extends _e{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===R?void 0:e}},ye=class extends _e{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==R)}},z=class extends _e{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=me(this,e,t,0)??R)===ce)return;let n=this._$AH,r=e===R&&n!==R||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==R&&(n===R||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},be=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){me(this,e)}},xe=w.litHtmlPolyfillSupport;xe?.(pe,ge),(w.litHtmlVersions??=[]).push(`3.3.3`);var Se=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new ge(t.insertBefore(N(),e),e,void 0,n??{})}return i._$AI(e),i},B=globalThis,Ce=class extends C{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Se(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return ce}};Ce._$litElement$=!0,Ce.finalized=!0,B.litElementHydrateSupport?.({LitElement:Ce});var V=B.litElementPolyfillSupport;V?.({LitElement:Ce}),(B.litElementVersions??=[]).push(`4.2.2`);var H=1e3,we=1001,Te=1002,Ee=1003,De=1004,Oe=1005,ke=1006,Ae=1007,je=1008,Me=1009,Ne=1010,Pe=1011,Fe=1012,Ie=1013,Le=1014,Re=1015,ze=1016,Be=1017,Ve=1018,He=1020,Ue=35902,We=35899,Ge=1021,Ke=1022,qe=1023,Je=1026,Ye=1027,Xe=1028,Ze=1029,Qe=1030,$e=1031,et=1033,tt=33776,nt=33777,rt=33778,it=33779,at=35840,ot=35841,st=35842,ct=35843,lt=36196,ut=37492,dt=37496,ft=37488,pt=37489,mt=37490,ht=37491,gt=37808,_t=37809,vt=37810,yt=37811,bt=37812,xt=37813,St=37814,Ct=37815,wt=37816,Tt=37817,Et=37818,Dt=37819,Ot=37820,kt=37821,At=36492,jt=36494,Mt=36495,Nt=36283,Pt=36284,Ft=36285,It=36286,Lt=2300,Rt=2301,zt=2302,Bt=2303,Vt=2400,Ht=2401,Ut=2402,Wt=3200,Gt=`srgb`,Kt=`srgb-linear`,qt=`linear`,Jt=`srgb`,Yt=7680,Xt=35044,Zt=2e3;function Qt(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function $t(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function en(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function tn(){let e=en(`canvas`);return e.style.display=`block`,e}var nn={};function rn(...e){let t=`THREE.`+e.shift();console.log(t,...e)}function an(e){let t=e[0];if(typeof t==`string`&&t.startsWith(`TSL:`)){let t=e[1];t&&t.isStackTrace?e[0]+=` `+t.getLocation():e[1]=`Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.`}return e}function U(...e){e=an(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.warn(n.getError(t)):console.warn(t,...e)}}function W(...e){e=an(e);let t=`THREE.`+e.shift();{let n=e[0];n&&n.isStackTrace?console.error(n.getError(t)):console.error(t,...e)}}function on(...e){let t=e.join(` `);t in nn||(nn[t]=!0,U(...e))}function sn(e,t,n){return new Promise(function(r,i){function a(){switch(e.clientWaitSync(t,e.SYNC_FLUSH_COMMANDS_BIT,0)){case e.WAIT_FAILED:i();break;case e.TIMEOUT_EXPIRED:setTimeout(a,n);break;default:r()}}setTimeout(a,n)})}var cn={0:0,2:6,4:4,3:5,1:1,6:2,7:7,5:3},ln=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n!==void 0&&n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let r=n[e];if(r!==void 0){let e=r.indexOf(t);e!==-1&&r.splice(e,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let t=n.slice(0);for(let n=0,r=t.length;n<r;n++)t[n].call(this,e);e.target=null}}},un=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),dn=Math.PI/180,fn=180/Math.PI;function pn(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(un[e&255]+un[e>>8&255]+un[e>>16&255]+un[e>>24&255]+`-`+un[t&255]+un[t>>8&255]+`-`+un[t>>16&15|64]+un[t>>24&255]+`-`+un[n&63|128]+un[n>>8&255]+`-`+un[n>>16&255]+un[n>>24&255]+un[r&255]+un[r>>8&255]+un[r>>16&255]+un[r>>24&255]).toLowerCase()}function G(e,t,n){return Math.max(t,Math.min(n,e))}function mn(e,t){return(e%t+t)%t}function hn(e,t,n){return(1-n)*e+n*t}function gn(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function _n(e){switch(e.constructor){case Uint32Array:return 4294967295;case Uint16Array:return 65535;case Uint8Array:case Uint8ClampedArray:return 255;case Int32Array:return 2147483647;case Int16Array:return 32767;case Int8Array:return 127;default:return}}function vn(e,t){if(t.constructor===Float32Array)return e;let n=_n(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.max(e/n,-1)}function yn(e,t){if(t.constructor===Float32Array)return e;let n=_n(t);if(n===void 0)throw Error(`THREE.MathUtils: Invalid component type.`);return Math.round(e*n)}var bn=class{static{this.prototype.isVector2=!0}constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`THREE.Vector2: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`THREE.Vector2: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=G(this.x,e.x,t.x),this.y=G(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=G(this.x,e,t),this.y=G(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(G(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(G(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},xn=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(u!==m||s!==d||c!==f||l!==p){let e=s*d+c*f+l*p+u*m;e<0&&(d=-d,f=-f,p=-p,m=-m,e=-e);let t=1-o;if(e<.9995){let n=Math.acos(e),r=Math.sin(n);t=Math.sin(t*n)/r,o=Math.sin(o*n)/r,s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o}else{s=s*t+d*o,c=c*t+f*o,l=l*t+p*o,u=u*t+m*o;let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:U(`Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(G(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,r=-r,i=-i,a=-a,o=-o);let s=1-t;if(o<.9995){let e=Math.acos(o),c=Math.sin(e);s=Math.sin(s*e)/c,t=Math.sin(t*e)/c,this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this._onChangeCallback()}else this._x=this._x*s+n*t,this._y=this._y*s+r*t,this._z=this._z*s+i*t,this._w=this._w*s+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},K=class{static{this.prototype.isVector3=!0}constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`THREE.Vector3: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`THREE.Vector3: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Cn.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Cn.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=G(this.x,e.x,t.x),this.y=G(this.y,e.y,t.y),this.z=G(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=G(this.x,e,t),this.y=G(this.y,e,t),this.z=G(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(G(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Sn.copy(this).projectOnVector(e),this.sub(Sn)}reflect(e){return this.sub(Sn.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(G(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},Sn=new K,Cn=new xn,q=class{static{this.prototype.isMatrix3=!0}constructor(e,t,n,r,i,a,o,s,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return on(`Matrix3: .scale() is deprecated. Use .makeScale() instead.`),this.premultiply(wn.makeScale(e,t)),this}rotate(e){return on(`Matrix3: .rotate() is deprecated. Use .makeRotation() instead.`),this.premultiply(wn.makeRotation(-e)),this}translate(e,t){return on(`Matrix3: .translate() is deprecated. Use .makeTranslation() instead.`),this.premultiply(wn.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},wn=new q,Tn=new q().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),En=new q().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Dn(){let e={enabled:!0,workingColorSpace:Kt,spaces:{},convert:function(e,t,n){return this.enabled===!1||t===n||!t||!n||(this.spaces[t].transfer===`srgb`&&(e.r=On(e.r),e.g=On(e.g),e.b=On(e.b)),this.spaces[t].primaries!==this.spaces[n].primaries&&(e.applyMatrix3(this.spaces[t].toXYZ),e.applyMatrix3(this.spaces[n].fromXYZ)),this.spaces[n].transfer===`srgb`&&(e.r=kn(e.r),e.g=kn(e.g),e.b=kn(e.b))),e},workingToColorSpace:function(e,t){return this.convert(e,this.workingColorSpace,t)},colorSpaceToWorking:function(e,t){return this.convert(e,t,this.workingColorSpace)},getPrimaries:function(e){return this.spaces[e].primaries},getTransfer:function(e){return e===``?qt:this.spaces[e].transfer},getToneMappingMode:function(e){return this.spaces[e].outputColorSpaceConfig.toneMappingMode||`standard`},getLuminanceCoefficients:function(e,t=this.workingColorSpace){return e.fromArray(this.spaces[t].luminanceCoefficients)},define:function(e){Object.assign(this.spaces,e)},_getMatrix:function(e,t,n){return e.copy(this.spaces[n].fromXYZ).multiply(this.spaces[t].toXYZ)},_getDrawingBufferColorSpace:function(e){return this.spaces[e].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(e=this.workingColorSpace){return this.spaces[e].workingColorSpaceConfig.unpackColorSpace}},t=[.64,.33,.3,.6,.15,.06],n=[.2126,.7152,.0722],r=[.3127,.329];return e.define({[Kt]:{primaries:t,whitePoint:r,transfer:qt,toXYZ:Tn,fromXYZ:En,luminanceCoefficients:n,workingColorSpaceConfig:{unpackColorSpace:Gt},outputColorSpaceConfig:{drawingBufferColorSpace:Gt}},[Gt]:{primaries:t,whitePoint:r,transfer:Jt,toXYZ:Tn,fromXYZ:En,luminanceCoefficients:n,outputColorSpaceConfig:{drawingBufferColorSpace:Gt}}}),e}var J=Dn();function On(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function kn(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var An,jn=class{static getDataURL(e,t=`image/png`){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{An===void 0&&(An=en(`canvas`)),An.width=e.width,An.height=e.height;let t=An.getContext(`2d`);e instanceof ImageData?t.putImageData(e,0,0):t.drawImage(e,0,0,e.width,e.height),n=An}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=en(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=On(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(On(t[e]/255)*255):t[e]=On(t[e]);return{data:t,width:e.width,height:e.height}}return U(`ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},Mn=0,Nn=class{constructor(e=null){this.isTextureSource=!0,Object.defineProperty(this,"id",{value:Mn++}),this.uuid=pn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<`u`&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<`u`&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t===null?e.set(0,0,0):e.set(t.width||0,t.height||0,t.depth||0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(Pn(r[t].image)):e.push(Pn(r[t]))}else e=Pn(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function Pn(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?jn.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(U(`Texture: Unable to serialize Texture.`),{})}var Fn=0,In=new K,Ln=class e extends ln{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=we,i=we,a=ke,o=je,s=qe,c=Me,l=e.DEFAULT_ANISOTROPY,u=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Fn++}),this.uuid=pn(),this.name=``,this.source=new Nn(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=o,this.anisotropy=l,this.format=s,this.internalFormat=null,this.type=c,this.offset=new bn(0,0),this.repeat=new bn(1,1),this.center=new bn(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new q,this.generateMipmaps=!0,this.mipmapsAutoUpdate=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0,this.isPMREMTexture=!1,this.normalized=!1}get width(){return this.source.getSize(In).x}get height(){return this.source.getSize(In).y}get depth(){return this.source.getSize(In).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.mipmapsAutoUpdate=e.mipmapsAutoUpdate,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isPMREMTexture=e.isPMREMTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){U(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?U(`Texture.setValues(): property '${t}' does not exist.`):r&&n&&r.isVector2&&n.isVector2||r&&n&&r.isVector3&&n.isVector3||r&&n&&r.isMatrix3&&n.isMatrix3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,mipmapsAutoUpdate:this.mipmapsAutoUpdate,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case H:e.x-=Math.floor(e.x);break;case we:e.x=e.x<0?0:1;break;case Te:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case H:e.y-=Math.floor(e.y);break;case we:e.y=e.y<0?0:1;break;case Te:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Ln.DEFAULT_IMAGE=null,Ln.DEFAULT_MAPPING=300,Ln.DEFAULT_ANISOTROPY=1;var Rn=class{static{this.prototype.isVector4=!0}constructor(e=0,t=0,n=0,r=1){this.x=e,this.y=t,this.z=n,this.w=r}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`THREE.Vector4: index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`THREE.Vector4: index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=G(this.x,e.x,t.x),this.y=G(this.y,e.y,t.y),this.z=G(this.z,e.z,t.z),this.w=G(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=G(this.x,e,t),this.y=G(this.y,e,t),this.z=G(this.z,e,t),this.w=G(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(G(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},zn=class extends ln{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ke,depthBuffer:!0,stencilBuffer:!1,resolveColorBuffer:!0,resolveDepthBuffer:!0,resolveStencilBuffer:!0,storeMultisampledColorBuffer:!0,storeMultisampledDepthBuffer:!0,storeMultisampledStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new Rn(0,0,e,t),this.scissorTest=!1,this.viewport=new Rn(0,0,e,t),this.textures=[];let r=n.count;for(let i=0;i<r;i++)this.textures[i]=new Ln({width:e,height:t,depth:n.depth}),this.textures[i].isRenderTargetTexture=!0,this.textures[i].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveColorBuffer=n.resolveColorBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this.storeMultisampledColorBuffer=n.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=n.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=n.storeMultisampledStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:ke,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.mipmapsAutoUpdate!==void 0&&(t.mipmapsAutoUpdate=e.mipmapsAutoUpdate),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let e=0;e<this.textures.length;e++)this.textures[e].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&this._depthTexture.renderTarget===this&&(this._depthTexture.renderTarget=null),e!==null&&e.renderTarget===null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n,this.textures[r].isData3DTexture!==!0&&(this.textures[r].isArrayTexture=this.textures[r].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let n=Object.assign({},e.textures[t].image);this.textures[t].source=new Nn(n)}if(this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveColorBuffer=e.resolveColorBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,this.storeMultisampledColorBuffer=e.storeMultisampledColorBuffer,this.storeMultisampledDepthBuffer=e.storeMultisampledDepthBuffer,this.storeMultisampledStencilBuffer=e.storeMultisampledStencilBuffer,e.depthTexture!==null){if(e.depthTexture.renderTarget===e){let t=e.depthTexture.clone();t.renderTarget=null,this.depthTexture=t}else this.depthTexture=e.depthTexture}else this.depthTexture=null;return this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:`dispose`})}},Bn=class extends zn{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},Vn=class extends Ln{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ee,this.minFilter=Ee,this.wrapR=we,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}},Hn=class extends Ln{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=Ee,this.minFilter=Ee,this.wrapR=we,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}copy(e){return super.copy(e),this.wrapR=e.wrapR,this}},Un=class e{static{this.prototype.isMatrix4=!0}constructor(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,r=1/Wn.setFromMatrixColumn(e,0).length(),i=1/Wn.setFromMatrixColumn(e,1).length(),a=1/Wn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Kn,e,qn)}lookAt(e,t,n){let r=this.elements;return Xn.subVectors(e,t),Xn.lengthSq()===0&&(Xn.z=1),Xn.normalize(),Jn.crossVectors(n,Xn),Jn.lengthSq()===0&&(Math.abs(n.z)===1?Xn.x+=1e-4:Xn.z+=1e-4,Xn.normalize(),Jn.crossVectors(n,Xn)),Jn.normalize(),Yn.crossVectors(Xn,Jn),r[0]=Jn.x,r[4]=Yn.x,r[8]=Xn.x,r[1]=Jn.y,r[5]=Yn.y,r[9]=Xn.y,r[2]=Jn.z,r[6]=Yn.z,r[10]=Xn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],M=r[14],N=r[3],P=r[7],ee=r[11],F=r[15];return i[0]=a*x+o*T+s*k+c*N,i[4]=a*S+o*E+s*A+c*P,i[8]=a*C+o*D+s*j+c*ee,i[12]=a*w+o*O+s*M+c*F,i[1]=l*x+u*T+d*k+f*N,i[5]=l*S+u*E+d*A+f*P,i[9]=l*C+u*D+d*j+f*ee,i[13]=l*w+u*O+d*M+f*F,i[2]=p*x+m*T+h*k+g*N,i[6]=p*S+m*E+h*A+g*P,i[10]=p*C+m*D+h*j+g*ee,i[14]=p*w+m*O+h*M+g*F,i[3]=_*x+v*T+y*k+b*N,i[7]=_*S+v*E+y*A+b*P,i[11]=_*C+v*D+y*j+b*ee,i[15]=_*w+v*O+y*M+b*F,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15],_=s*f-c*d,v=o*f-c*u,y=o*d-s*u,b=a*f-c*l,x=a*d-s*l,S=a*u-o*l;return t*(m*_-h*v+g*y)-n*(p*_-h*b+g*x)+r*(p*v-m*b+g*S)-i*(p*y-m*x+h*S)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[1],a=e[5],o=e[9],s=e[2],c=e[6],l=e[10];return t*(a*l-o*c)-n*(i*l-o*s)+r*(i*c-a*s)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=t*o-n*a,v=t*s-r*a,y=t*c-i*a,b=n*s-r*o,x=n*c-i*o,S=r*c-i*s,C=l*m-u*p,w=l*h-d*p,T=l*g-f*p,E=u*h-d*m,D=u*g-f*m,O=d*g-f*h,k=_*O-v*D+y*E+b*T-x*w+S*C;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let A=1/k;return e[0]=(o*O-s*D+c*E)*A,e[1]=(r*D-n*O-i*E)*A,e[2]=(m*S-h*x+g*b)*A,e[3]=(d*x-u*S-f*b)*A,e[4]=(s*T-a*O-c*w)*A,e[5]=(t*O-r*T+i*w)*A,e[6]=(h*y-p*S-g*v)*A,e[7]=(l*S-d*y+f*v)*A,e[8]=(a*D-o*T+c*C)*A,e[9]=(n*T-t*D-i*C)*A,e[10]=(p*x-m*y+g*_)*A,e[11]=(u*y-l*x-f*_)*A,e[12]=(o*w-a*E-s*C)*A,e[13]=(t*E-n*w+r*C)*A,e[14]=(m*v-p*b-h*_)*A,e[15]=(l*b-u*v+d*_)*A,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements;e.x=r[12],e.y=r[13],e.z=r[14];let i=this.determinantAffine();if(i===0)return n.set(1,1,1),t.identity(),this;let a=Wn.set(r[0],r[1],r[2]).length(),o=Wn.set(r[4],r[5],r[6]).length(),s=Wn.set(r[8],r[9],r[10]).length();i<0&&(a=-a),Gn.copy(this);let c=1/a,l=1/o,u=1/s;return Gn.elements[0]*=c,Gn.elements[1]*=c,Gn.elements[2]*=c,Gn.elements[4]*=l,Gn.elements[5]*=l,Gn.elements[6]*=l,Gn.elements[8]*=u,Gn.elements[9]*=u,Gn.elements[10]*=u,t.setFromRotationMatrix(Gn),n.x=a,n.y=o,n.z=s,this}makePerspective(e,t,n,r,i,a,o=Zt,s=!1){let c=this.elements,l=2*i/(t-e),u=2*i/(n-r),d=(t+e)/(t-e),f=(n+r)/(n-r),p,m;if(s)p=i/(a-i),m=a*i/(a-i);else if(o===2e3)p=-(a+i)/(a-i),m=-2*a*i/(a-i);else if(o===2001)p=-a/(a-i),m=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=u,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=Zt,s=!1){let c=this.elements,l=2/(t-e),u=2/(n-r),d=-(t+e)/(t-e),f=-(n+r)/(n-r),p,m;if(s)p=1/(a-i),m=a/(a-i);else if(o===2e3)p=-2/(a-i),m=-(a+i)/(a-i);else if(o===2001)p=-1/(a-i),m=-i/(a-i);else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return c[0]=l,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=u,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=p,c[14]=m,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Wn=new K,Gn=new Un,Kn=new K(0,0,0),qn=new K(1,1,1),Jn=new K,Yn=new K,Xn=new K,Zn=new Un,Qn=new xn,$n=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(G(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-G(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(G(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-G(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(G(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-G(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:U(`Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Zn.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Zn,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Qn.setFromEuler(this),this.setFromQuaternion(Qn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};$n.DEFAULT_ORDER=`XYZ`;var er=class{constructor(){this.mask=1}set(e){this.mask=1<<e>>>0}enable(e){this.mask|=1<<e}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e}disable(e){this.mask&=~(1<<e)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&1<<e)}},tr=0,nr=new K,rr=new xn,ir=new Un,ar=new K,or=new K,sr=new K,cr=new xn,lr=new K(1,0,0),ur=new K(0,1,0),dr=new K(0,0,1),fr={type:`added`},pr={type:`removed`},mr={type:`childadded`,child:null},hr={type:`childremoved`,child:null},gr=class e extends ln{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:tr++}),this.uuid=pn(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new K,n=new $n,r=new xn,i=new K(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new Un},normalMatrix:{value:new q}}),this.matrix=new Un,this.matrixWorld=new Un,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new er,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale),this.pivot!==null&&this.position.copy(this.pivot).applyMatrix4(this.matrix).sub(this.pivot)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return rr.setFromAxisAngle(e,t),this.quaternion.multiply(rr),this}rotateOnWorldAxis(e,t){return rr.setFromAxisAngle(e,t),this.quaternion.premultiply(rr),this}rotateX(e){return this.rotateOnAxis(lr,e)}rotateY(e){return this.rotateOnAxis(ur,e)}rotateZ(e){return this.rotateOnAxis(dr,e)}translateOnAxis(e,t){return nr.copy(e).applyQuaternion(this.quaternion),this.position.add(nr.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(lr,e)}translateY(e){return this.translateOnAxis(ur,e)}translateZ(e){return this.translateOnAxis(dr,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ir.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ar.copy(e):ar.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),or.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ir.lookAt(or,ar,this.up):ir.lookAt(ar,or,this.up),this.quaternion.setFromRotationMatrix(ir),r&&(ir.extractRotation(r.matrixWorld),rr.setFromRotationMatrix(ir),this.quaternion.premultiply(rr.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(W(`Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(fr),mr.child=e,this.dispatchEvent(mr),mr.child=null):W(`Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(pr),hr.child=e,this.dispatchEvent(hr),hr.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ir.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ir.multiply(e.parent.matrixWorld)),e.applyMatrix4(ir),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(fr),mr.child=e,this.dispatchEvent(mr),mr.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(or,e,sr),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(or,cr,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}intersectsFrustum(){return!0}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,r=e.z,i=this.matrix.elements;i[12]+=t-i[0]*t-i[4]*n-i[8]*r,i[13]+=n-i[1]*t-i[5]*n-i[9]*r,i[14]+=r-i[2]*t-i[6]*n-i[10]*r}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let r=this.parent;if(e===!0&&r!==null&&r.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let e=this.children;for(let t=0,r=e.length;t<r;t++)e[t].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,r.name=this.name,r.castShadow=this.castShadow,r.receiveShadow=this.receiveShadow,r.visible=this.visible,r.frustumCulled=this.frustumCulled,r.renderOrder=this.renderOrder,r.static=this.static,r.matrixAutoUpdate=this.matrixAutoUpdate,Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.pivot!==null&&(r.pivot=this.pivot.toArray()),this.morphTargetDictionary!==void 0&&(r.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(r.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.geometryInfo=this._geometryInfo.map(e=>({...e,boundingBox:e.boundingBox?e.boundingBox.toJSON():void 0,boundingSphere:e.boundingSphere?e.boundingSphere.toJSON():void 0})),r.instanceInfo=this._instanceInfo.map(e=>({...e})),r.availableInstanceIds=this._availableInstanceIds.slice(),r.availableGeometryIds=this._availableGeometryIds.slice(),r.nextIndexStart=this._nextIndexStart,r.nextVertexStart=this._nextVertexStart,r.geometryCount=this._geometryCount,r.maxInstanceCount=this._maxInstanceCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.matricesTexture=this._matricesTexture.toJSON(e),r.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(r.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(r.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(r.boundingBox=this.boundingBox.toJSON()));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot===null?null:e.pivot.clone(),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}dispose(){this.dispatchEvent({type:`dispose`})}};gr.DEFAULT_UP=new K(0,1,0),gr.DEFAULT_MATRIX_AUTO_UPDATE=!0,gr.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var _r=class extends gr{constructor(){super(),this.isGroup=!0,this.type=`Group`}},vr={type:`move`},yr=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new _r,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new _r,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new K,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new K),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new _r,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new K,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new K,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.quaternion,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.quaternion,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1,s.eventsEnabled&&s.dispatchEvent({type:`gripUpdated`,data:e,target:this})));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(vr)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new _r;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},br={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},xr={h:0,s:0,l:0},Sr={h:0,s:0,l:0};function Cr(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var Y=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Gt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,J.colorSpaceToWorking(this,t),this}setRGB(e,t,n,r=J.workingColorSpace){return this.r=e,this.g=t,this.b=n,J.colorSpaceToWorking(this,r),this}setHSL(e,t,n,r=J.workingColorSpace){if(e=mn(e,1),t=G(t,0,1),n=G(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Cr(i,r,e+1/3),this.g=Cr(i,r,e),this.b=Cr(i,r,e-1/3)}return J.colorSpaceToWorking(this,r),this}setStyle(e,t=Gt){function n(t){t!==void 0&&parseFloat(t)<1&&U(`Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseFloat(i[1]))/100,Math.min(100,parseFloat(i[2]))/100,Math.min(100,parseFloat(i[3]))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*,\s*(\d+(?:\.\d+)?|\.\d+)\%\s*(?:,\s*(\d+(?:\.\d+)?|\.\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:U(`Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);U(`Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Gt){let n=br[e.toLowerCase()];return n===void 0?U(`Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=On(e.r),this.g=On(e.g),this.b=On(e.b),this}copyLinearToSRGB(e){return this.r=kn(e.r),this.g=kn(e.g),this.b=kn(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Gt){return J.workingToColorSpace(wr.copy(this),e),Math.round(G(wr.r*255,0,255))*65536+Math.round(G(wr.g*255,0,255))*256+Math.round(G(wr.b*255,0,255))}getHexString(e=Gt){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=J.workingColorSpace){J.workingToColorSpace(wr.copy(this),t);let n=wr.r,r=wr.g,i=wr.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=J.workingColorSpace){return J.workingToColorSpace(wr.copy(this),t),e.r=wr.r,e.g=wr.g,e.b=wr.b,e}getStyle(e=Gt){J.workingToColorSpace(wr.copy(this),e);let t=wr.r,n=wr.g,r=wr.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(xr),this.setHSL(xr.h+e,xr.s+t,xr.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(xr),e.getHSL(Sr);let n=hn(xr.h,Sr.h,t),r=hn(xr.s,Sr.s,t),i=hn(xr.l,Sr.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},wr=new Y;Y.NAMES=br;var Tr=class extends gr{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new $n,this.environmentIntensity=1,this.environmentRotation=new $n,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),this.background=e.background===null?null:e.background.clone(),this.environment=e.environment===null?null:e.environment.clone(),this.fog=e.fog===null?null:e.fog.clone(),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),this.overrideMaterial=e.overrideMaterial===null?null:e.overrideMaterial.clone(),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),t.object.backgroundBlurriness=this.backgroundBlurriness,t.object.backgroundIntensity=this.backgroundIntensity,t.object.backgroundRotation=this.backgroundRotation.toArray(),t.object.environmentIntensity=this.environmentIntensity,t.object.environmentRotation=this.environmentRotation.toArray(),t}},Er=new K,Dr=new K,Or=new K,kr=new K,Ar=new K,jr=new K,Mr=new K,Nr=new K,Pr=new K,Fr=new K,Ir=new Rn,Lr=new Rn,Rr=new Rn,zr=class e{constructor(e=new K,t=new K,n=new K){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Er.subVectors(e,t),r.cross(Er);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Er.subVectors(r,t),Dr.subVectors(n,t),Or.subVectors(e,t);let a=Er.dot(Er),o=Er.dot(Dr),s=Er.dot(Or),c=Dr.dot(Dr),l=Dr.dot(Or),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,kr)!==null&&kr.x>=0&&kr.y>=0&&kr.x+kr.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,kr)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,kr.x),s.addScaledVector(a,kr.y),s.addScaledVector(o,kr.z),s)}static getInterpolatedAttribute(e,t,n,r,i,a){return Ir.setScalar(0),Lr.setScalar(0),Rr.setScalar(0),Ir.fromBufferAttribute(e,t),Lr.fromBufferAttribute(e,n),Rr.fromBufferAttribute(e,r),a.setScalar(0),a.addScaledVector(Ir,i.x),a.addScaledVector(Lr,i.y),a.addScaledVector(Rr,i.z),a}static isFrontFacing(e,t,n,r){return Er.subVectors(n,t),Dr.subVectors(e,t),Er.cross(Dr).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Er.subVectors(this.c,this.b),Dr.subVectors(this.a,this.b),Er.cross(Dr).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Ar.subVectors(r,n),jr.subVectors(i,n),Nr.subVectors(e,n);let s=Ar.dot(Nr),c=jr.dot(Nr);if(s<=0&&c<=0)return t.copy(n);Pr.subVectors(e,r);let l=Ar.dot(Pr),u=jr.dot(Pr);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0&&s-l>0)return a=s/(s-l),t.copy(n).addScaledVector(Ar,a);Fr.subVectors(e,i);let f=Ar.dot(Fr),p=jr.dot(Fr);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(jr,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return Mr.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(Mr,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Ar,a).addScaledVector(jr,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Br=class{constructor(e=new K(1/0,1/0,1/0),t=new K(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Hr.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Hr.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Hr.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0&&e.isBatchedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,Hr):Hr.fromBufferAttribute(r,t),Hr.applyMatrix4(e.matrixWorld),this.expandByPoint(Hr);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),Ur.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),Ur.copy(e.boundingBox)),Ur.applyMatrix4(e.matrixWorld),this.union(Ur)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Hr),Hr.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Xr),Zr.subVectors(this.max,Xr),Wr.subVectors(e.a,Xr),Gr.subVectors(e.b,Xr),Kr.subVectors(e.c,Xr),qr.subVectors(Gr,Wr),Jr.subVectors(Kr,Gr),Yr.subVectors(Wr,Kr);let t=[0,-qr.z,qr.y,0,-Jr.z,Jr.y,0,-Yr.z,Yr.y,qr.z,0,-qr.x,Jr.z,0,-Jr.x,Yr.z,0,-Yr.x,-qr.y,qr.x,0,-Jr.y,Jr.x,0,-Yr.y,Yr.x,0];return!ei(t,Wr,Gr,Kr,Zr)||(t=[1,0,0,0,1,0,0,0,1],!ei(t,Wr,Gr,Kr,Zr))?!1:(Qr.crossVectors(qr,Jr),t=[Qr.x,Qr.y,Qr.z],ei(t,Wr,Gr,Kr,Zr))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Hr).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Hr).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()||(Vr[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Vr[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Vr[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Vr[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Vr[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Vr[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Vr[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Vr[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Vr)),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Vr=[new K,new K,new K,new K,new K,new K,new K,new K],Hr=new K,Ur=new Br,Wr=new K,Gr=new K,Kr=new K,qr=new K,Jr=new K,Yr=new K,Xr=new K,Zr=new K,Qr=new K,$r=new K;function ei(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){$r.fromArray(e,a);let o=i.x*Math.abs($r.x)+i.y*Math.abs($r.y)+i.z*Math.abs($r.z),s=t.dot($r),c=n.dot($r),l=r.dot($r);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var ti=new K,ni=new bn,ri=0,ii=class extends ln{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:ri++}),this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=Xt,this.updateRanges=[],this.gpuType=Re,this.version=0,this._normalizationScale=e===void 0?void 0:_n(e)}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this._normalizationScale=e._normalizationScale,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ni.fromBufferAttribute(this,t),ni.applyMatrix3(e),this.setXY(t,ni.x,ni.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)ti.fromBufferAttribute(this,t),ti.applyMatrix3(e),this.setXYZ(t,ti.x,ti.y,ti.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)ti.fromBufferAttribute(this,t),ti.applyMatrix4(e),this.setXYZ(t,ti.x,ti.y,ti.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)ti.fromBufferAttribute(this,t),ti.applyNormalMatrix(e),this.setXYZ(t,ti.x,ti.y,ti.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)ti.fromBufferAttribute(this,t),ti.transformDirection(e),this.setXYZ(t,ti.x,ti.y,ti.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=this._denormalize(n)),n}setComponent(e,t,n){return this.normalized&&(n=this._normalize(n)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=this._denormalize(t)),t}setX(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=this._denormalize(t)),t}setY(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=this._denormalize(t)),t}setZ(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=this._denormalize(t)),t}setW(e,t){return this.normalized&&(t=this._normalize(t)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=this._normalize(t),n=this._normalize(n),r=this._normalize(r),i=this._normalize(i)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return e.name=this.name,e.usage=this.usage,e.gpuType=this.gpuType,e}dispose(){this.dispatchEvent({type:`dispose`})}_denormalize(e){let t=this._normalizationScale;return t===void 0?vn(e,this.array):Math.max(e/t,-1)}_normalize(e){let t=this._normalizationScale;return t===void 0?yn(e,this.array):Math.round(e*t)}},ai=class extends ii{constructor(e,t,n){super(new Uint16Array(e),t,n)}},oi=class extends ii{constructor(e,t,n){super(new Uint32Array(e),t,n)}},si=class extends ii{constructor(e,t,n){super(new Float32Array(e),t,n)}},ci=new Br,li=new K,ui=new K,di=class{constructor(e=new K,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?ci.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;li.subVectors(e,this.center);let t=li.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(li,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(ui.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(li.copy(e.center).add(ui)),this.expandByPoint(li.copy(e.center).sub(ui))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},fi=0,pi=new Un,mi=new gr,hi=new K,gi=new Br,_i=new Br,vi=new K,yi=class e extends ln{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:fi++}),this.uuid=pn(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(Qt(e)?oi:ai)(e,1):e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new q().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return pi.makeRotationFromQuaternion(e),this.applyMatrix4(pi),this}rotateX(e){return pi.makeRotationX(e),this.applyMatrix4(pi),this}rotateY(e){return pi.makeRotationY(e),this.applyMatrix4(pi),this}rotateZ(e){return pi.makeRotationZ(e),this.applyMatrix4(pi),this}translate(e,t,n){return pi.makeTranslation(e,t,n),this.applyMatrix4(pi),this}scale(e,t,n){return pi.makeScale(e,t,n),this.applyMatrix4(pi),this}lookAt(e){return mi.lookAt(e),mi.updateMatrix(),this.applyMatrix4(mi.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(hi).negate(),this.translate(hi.x,hi.y,hi.z),this}setFromPoints(e){let t=this.getAttribute(`position`);if(t===void 0){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}this.setAttribute(`position`,new si(t,3))}else{let n=Math.min(e.length,t.count);for(let r=0;r<n;r++){let n=e[r];t.setXYZ(r,n.x,n.y,n.z||0)}e.length>t.count&&U(`BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.`),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Br);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)W(`BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new K(-1/0,-1/0,-1/0),new K(1/0,1/0,1/0));else{if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];gi.setFromBufferAttribute(n),this.morphTargetsRelative?(vi.addVectors(this.boundingBox.min,gi.min),this.boundingBox.expandByPoint(vi),vi.addVectors(this.boundingBox.max,gi.max),this.boundingBox.expandByPoint(vi)):(this.boundingBox.expandByPoint(gi.min),this.boundingBox.expandByPoint(gi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&W(`BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new di);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute)W(`BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new K,1/0);else if(e){let n=this.boundingSphere.center;if(gi.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];_i.setFromBufferAttribute(n),this.morphTargetsRelative?(vi.addVectors(gi.min,_i.min),gi.expandByPoint(vi),vi.addVectors(gi.max,_i.max),gi.expandByPoint(vi)):(gi.expandByPoint(_i.min),gi.expandByPoint(_i.max))}gi.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)vi.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(vi));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)vi.fromBufferAttribute(a,t),o&&(hi.fromBufferAttribute(e,t),vi.add(hi)),r=Math.max(r,n.distanceToSquared(vi))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&W(`BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){W(`BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv,a=this.getAttribute(`tangent`);(a===void 0||a.count!==n.count)&&(a=new ii(new Float32Array(4*n.count),4),this.setAttribute(`tangent`,a));let o=[],s=[],c=new Uint8Array(n.count);for(let e=0;e<n.count;e++)o[e]=new K,s[e]=new K;let l=new K,u=new K,d=new K,f=new bn,p=new bn,m=new bn,h=new K,g=new K;function _(e,t,r){c[e]=c[t]=c[r]=1,l.fromBufferAttribute(n,e),u.fromBufferAttribute(n,t),d.fromBufferAttribute(n,r),f.fromBufferAttribute(i,e),p.fromBufferAttribute(i,t),m.fromBufferAttribute(i,r),u.sub(l),d.sub(l),p.sub(f),m.sub(f);let a=1/(p.x*m.y-m.x*p.y);isFinite(a)&&(h.copy(u).multiplyScalar(m.y).addScaledVector(d,-p.y).multiplyScalar(a),g.copy(d).multiplyScalar(p.x).addScaledVector(u,-m.x).multiplyScalar(a),o[e].add(h),o[t].add(h),o[r].add(h),s[e].add(g),s[t].add(g),s[r].add(g))}let v=this.groups;v.length===0&&(v=[{start:0,count:e.count}]);for(let t=0,n=v.length;t<n;++t){let n=v[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)_(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let y=new K,b=new K,x=new K,S=new K;function C(e){x.fromBufferAttribute(r,e),S.copy(x);let t=o[e];y.copy(t),y.sub(x.multiplyScalar(x.dot(t))).normalize(),b.crossVectors(S,t);let n=b.dot(s[e])<0?-1:1;a.setXYZW(e,y.x,y.y,y.z,n)}for(let e=0,t=n.count;e<t;++e)c[e]&&C(e);this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0||n.count!==t.count)n=new ii(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new K,i=new K,a=new K,o=new K,s=new K,c=new K,l=new K,u=new K;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)vi.fromBufferAttribute(e,t),vi.normalize(),e.setXYZ(t,vi.x,vi.y,vi.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new ii(a,r,i)}if(this.index===null)return U(`BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.7,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?`BufferGeometry`:this.type,e.name=this.name,Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:`dispose`})}},bi=new K,xi=new K,Si=new q,Ci=class{constructor(e=new K(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=bi.subVectors(n,t).cross(xi.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let r=e.delta(bi),i=this.normal.dot(r);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/i;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(r,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Si.getNormalMatrix(e),r=this.coplanarPoint(bi).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}toJSON(){return{normal:this.normal.toArray(),constant:this.constant}}fromJSON(e){return this.normal.fromArray(e.normal),this.constant=e.constant,this}},wi=0,Ti=class extends ln{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:wi++}),this.uuid=pn(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Y(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Yt,this.stencilZFail=Yt,this.stencilZPass=Yt,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){U(`Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];r===void 0?U(`Material: '${t}' is not a property of THREE.${this.type}.`):r&&r.isColor?r.set(n):r&&r.isVector2&&n&&n.isVector2||r&&r.isEuler&&n&&n.isEuler||r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,n.blending=this.blending,n.side=this.side,n.shadowSide=this.shadowSide,n.vertexColors=this.vertexColors,n.opacity=this.opacity,n.transparent=this.transparent,n.blendSrc=this.blendSrc,n.blendDst=this.blendDst,n.blendEquation=this.blendEquation,n.blendSrcAlpha=this.blendSrcAlpha,n.blendDstAlpha=this.blendDstAlpha,n.blendEquationAlpha=this.blendEquationAlpha,n.blendColor=this.blendColor.getHex(),n.blendAlpha=this.blendAlpha,n.depthFunc=this.depthFunc,n.depthTest=this.depthTest,n.depthWrite=this.depthWrite,n.colorWrite=this.colorWrite,n.clipIntersection=this.clipIntersection,n.clipShadows=this.clipShadows,n.stencilWriteMask=this.stencilWriteMask,n.stencilFunc=this.stencilFunc,n.stencilRef=this.stencilRef,n.stencilFuncMask=this.stencilFuncMask,n.stencilFail=this.stencilFail,n.stencilZFail=this.stencilZFail,n.stencilZPass=this.stencilZPass,n.stencilWrite=this.stencilWrite,n.polygonOffset=this.polygonOffset,n.polygonOffsetFactor=this.polygonOffsetFactor,n.polygonOffsetUnits=this.polygonOffsetUnits,n.dithering=this.dithering,n.alphaTest=this.alphaTest,n.alphaHash=this.alphaHash,n.alphaToCoverage=this.alphaToCoverage,n.premultipliedAlpha=this.premultipliedAlpha,n.forceSinglePass=this.forceSinglePass,n.allowOverride=this.allowOverride,n.visible=this.visible,n.toneMapped=this.toneMapped,n.name=this.name,this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.diffuseRoughness!==void 0&&(n.diffuseRoughness=this.diffuseRoughness),this.diffuseRoughnessMap&&this.diffuseRoughnessMap.isTexture&&(n.diffuseRoughnessMap=this.diffuseRoughnessMap.toJSON(e).uuid),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.retroreflectivity!==void 0&&(n.retroreflectivity=this.retroreflectivity),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessMinimum!==void 0&&(n.iridescenceThicknessMinimum=this.iridescenceThicknessMinimum),this.iridescenceThicknessMaximum!==void 0&&(n.iridescenceThicknessMaximum=this.iridescenceThicknessMaximum),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),Array.isArray(this.clippingPlanes)&&this.clippingPlanes.length>0&&(n.clippingPlanes=this.clippingPlanes.map(e=>e.toJSON())),this.rotation!==void 0&&(n.rotation=this.rotation),this.depthPacking!==void 0&&(n.depthPacking=this.depthPacking),this.linewidth!==void 0&&(n.linewidth=this.linewidth),this.linecap!==void 0&&(n.linecap=this.linecap),this.linejoin!==void 0&&(n.linejoin=this.linejoin),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.wireframe!==void 0&&(n.wireframe=this.wireframe),this.wireframeLinewidth!==void 0&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==void 0&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==void 0&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading!==void 0&&(n.flatShading=this.flatShading),this.fog!==void 0&&(n.fog=this.fog),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Y().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.diffuseRoughness!==void 0&&(this.diffuseRoughness=e.diffuseRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.retroreflectivity!==void 0&&(this.retroreflectivity=e.retroreflectivity),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessMinimum!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessMinimum),e.iridescenceThicknessMaximum!==void 0&&(this.iridescenceThicknessMaximum=e.iridescenceThicknessMaximum),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],this.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1]),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.clippingPlanes!==void 0&&(this.clippingPlanes=e.clippingPlanes.map(e=>new Ci().fromJSON(e))),e.clipIntersection!==void 0&&(this.clipIntersection=e.clipIntersection),e.clipShadows!==void 0&&(this.clipShadows=e.clipShadows),e.depthPacking!==void 0&&(this.depthPacking=e.depthPacking),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.linecap!==void 0&&(this.linecap=e.linecap),e.linejoin!==void 0&&(this.linejoin=e.linejoin),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(this.vertexColors=typeof e.vertexColors==`number`?e.vertexColors>0:e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let t=e.normalScale;Array.isArray(t)===!1&&(t=[t,t]),this.normalScale=new bn().fromArray(t)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new bn().fromArray(e.clearcoatNormalScale)),e.diffuseRoughnessMap!==void 0&&(this.diffuseRoughnessMap=t[e.diffuseRoughnessMap]||null),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Ei=new K,Di=new K,Oi=new K,ki=new K,Ai=class{constructor(e=new K,t=new K(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Ei)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Ei.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Ei.copy(this.origin).addScaledVector(this.direction,t),Ei.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Di.copy(e).add(t).multiplyScalar(.5),Oi.copy(t).sub(e).normalize(),ki.copy(this.origin).sub(Di);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Oi),o=ki.dot(this.direction),s=-ki.dot(Oi),c=ki.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Di).addScaledVector(Oi,d),f}intersectSphere(e,t){if(e.radius<0)return null;Ei.subVectors(e.center,this.origin);let n=Ei.dot(this.direction),r=Ei.dot(Ei)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Ei)!==null}intersectTriangle(e,t,n,r,i){let a=this.origin,o=this.direction,s=o.x,c=o.y,l=o.z,u=e.x-a.x,d=e.y-a.y,f=e.z-a.z,p=t.x-a.x,m=t.y-a.y,h=t.z-a.z,g=n.x-a.x,_=n.y-a.y,v=n.z-a.z,y=Math.abs(s),b=Math.abs(c),x=Math.abs(l),S,C,w,T,E,D,O,k,A,j,M,N;if(y>=b&&y>=x?(w=s,D=u,A=p,N=g,s>=0?(S=c,C=l,T=d,E=f,O=m,k=h,j=_,M=v):(S=l,C=c,T=f,E=d,O=h,k=m,j=v,M=_)):b>=x?(w=c,D=d,A=m,N=_,c>=0?(S=l,C=s,T=f,E=u,O=h,k=p,j=v,M=g):(S=s,C=l,T=u,E=f,O=p,k=h,j=g,M=v)):(w=l,D=f,A=h,N=v,l>=0?(S=s,C=c,T=u,E=d,O=p,k=m,j=g,M=_):(S=c,C=s,T=d,E=u,O=m,k=p,j=_,M=g)),w===0)return null;let P=S/w,ee=C/w,F=1/w,te=T-P*D,ne=E-ee*D,re=O-P*A,ie=k-ee*A,I=j-P*N,ae=M-ee*N,oe=I*ie-ae*re,se=te*ae-ne*I,L=re*ne-ie*te;if(r){if(oe<0||se<0||L<0)return null}else if((oe<0||se<0||L<0)&&(oe>0||se>0||L>0))return null;let ce=oe+se+L;if(ce===0)return null;let R=F*(oe*D+se*A+L*N);return(ce>0?R<0:R>0)?null:this.at(R/ce,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},ji=class extends Ti{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new Y(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new $n,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Mi=new Un,Ni=new Ai,Pi=new di,Fi=new K,Ii=new K,Li=new K,Ri=new K,zi=new K,Bi=new K,Vi=new K,Hi=new K,Ui=class extends gr{constructor(e=new yi,t=new ji){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){Bi.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(zi.fromBufferAttribute(s,e),a?Bi.addScaledVector(zi,r):Bi.addScaledVector(zi.sub(t),r))}t.add(Bi)}return t}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Pi.copy(n.boundingSphere),Pi.applyMatrix4(i),Ni.copy(e.ray).recast(e.near),Pi.containsPoint(Ni.origin)===!1&&(Ni.intersectSphere(Pi,Fi)===null||Ni.origin.distanceToSquared(Fi)>(e.far-e.near)**2)||(Mi.copy(i).invert(),Ni.copy(e.ray).applyMatrix4(Mi),(n.boundingBox===null||Ni.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,Ni)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=Gi(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=Gi(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=Gi(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=Gi(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function Wi(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;Hi.copy(s),Hi.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(Hi);return l<n.near||l>n.far?null:{distance:l,point:Hi.clone(),object:e}}function Gi(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,Ii),e.getVertexPosition(c,Li),e.getVertexPosition(l,Ri);let u=Wi(e,t,n,r,Ii,Li,Ri,Vi);if(u){let e=new K;zr.getBarycoord(Vi,Ii,Li,Ri,e),i&&(u.uv=zr.getInterpolatedAttribute(i,s,c,l,e,new bn)),a&&(u.uv1=zr.getInterpolatedAttribute(a,s,c,l,e,new bn)),o&&(u.normal=zr.getInterpolatedAttribute(o,s,c,l,e,new K),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let t={a:s,b:c,c:l,normal:new K,materialIndex:0};zr.getNormal(Ii,Li,Ri,t.normal),u.face=t,u.barycoord=e}return u}var Ki=class extends Ln{constructor(e=null,t=1,n=1,r,i,a,o,s,c=Ee,l=Ee,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},qi=new di,Ji=new bn(.5,.5),Yi=new K,Xi=class{constructor(e=new Ci,t=new Ci,n=new Ci,r=new Ci,i=new Ci,a=new Ci){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Zt,n=!1){let r=this.planes,i=e.elements,a=i[0],o=i[1],s=i[2],c=i[3],l=i[4],u=i[5],d=i[6],f=i[7],p=i[8],m=i[9],h=i[10],g=i[11],_=i[12],v=i[13],y=i[14],b=i[15];if(r[0].setComponents(c-a,f-l,g-p,b-_).normalize(),r[1].setComponents(c+a,f+l,g+p,b+_).normalize(),r[2].setComponents(c+o,f+u,g+m,b+v).normalize(),r[3].setComponents(c-o,f-u,g-m,b-v).normalize(),n)r[4].setComponents(s,d,h,y).normalize(),r[5].setComponents(c-s,f-d,g-h,b-y).normalize();else if(r[4].setComponents(c-s,f-d,g-h,b-y).normalize(),t===2e3)r[5].setComponents(c+s,f+d,g+h,b+y).normalize();else if(t===2001)r[5].setComponents(s,d,h,y).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),qi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),qi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(qi)}intersectsSprite(e){return qi.center.set(0,0,0),qi.radius=.7071067811865476+Ji.distanceTo(e.center),qi.applyMatrix4(e.matrixWorld),this.intersectsSphere(qi)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Yi.x=r.normal.x>0?e.max.x:e.min.x,Yi.y=r.normal.y>0?e.max.y:e.min.y,Yi.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Yi)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}},Zi=new Un,Qi=class e{constructor(){this.coordinateSystem=Zt,this._frustums=[],this._count=0}setFromArrayCamera(e){let t=e.cameras,n=this._frustums;for(let e=0;e<t.length;e++){let r=t[e];Zi.multiplyMatrices(r.projectionMatrix,r.matrixWorldInverse),n[e]===void 0&&(n[e]=new Xi),n[e].setFromProjectionMatrix(Zi,r.coordinateSystem,r.reversedDepth)}return this._count=t.length,this}getFrustum(e){return this._frustums[e]}intersectsObject(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsObject(e))return!0;return!1}intersectsSprite(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSprite(e))return!0;return!1}intersectsSphere(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsSphere(e))return!0;return!1}intersectsBox(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].intersectsBox(e))return!0;return!1}containsPoint(e){let t=this._frustums;for(let n=0;n<this._count;n++)if(t[n].containsPoint(e))return!0;return!1}copy(e){this.coordinateSystem=e.coordinateSystem;let t=this._frustums,n=e._frustums;for(let r=0;r<e._count;r++)t[r]===void 0&&(t[r]=new Xi),t[r].copy(n[r]);return this._count=e._count,this}clone(){return new e().copy(this)}},$i=class extends Ti{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new Y(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},ea=new K,ta=new K,na=new Un,ra=new Ai,ia=new di,aa=new K,oa=new K,sa=class extends gr{constructor(e=new yi,t=new $i){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.morphTargetInfluences=e.morphTargetInfluences===void 0?void 0:e.morphTargetInfluences.slice(),this.morphTargetDictionary=e.morphTargetDictionary===void 0?void 0:Object.assign({},e.morphTargetDictionary),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)ea.fromBufferAttribute(t,e-1),ta.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=ea.distanceTo(ta);e.setAttribute(`lineDistance`,new si(n,1))}else U(`Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}intersectsFrustum(e){return e.intersectsObject(this)}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),ia.copy(n.boundingSphere),ia.applyMatrix4(r),ia.radius+=i,e.ray.intersectsSphere(ia)===!1)return;na.copy(r).invert(),ra.copy(e.ray).applyMatrix4(na);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=this.isLineSegments?2:1,l=n.index,u=n.attributes.position;if(l!==null){let n=Math.max(0,a.start),r=Math.min(l.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=l.getX(i),r=l.getX(i+1),a=ca(this,e,ra,s,n,r,i);a&&t.push(a)}if(this.isLineLoop){let i=l.getX(r-1),a=l.getX(n),o=ca(this,e,ra,s,i,a,r-1);o&&t.push(o)}}else{let n=Math.max(0,a.start),r=Math.min(u.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=c){let n=ca(this,e,ra,s,i,i+1,i);n&&t.push(n)}if(this.isLineLoop){let i=ca(this,e,ra,s,r-1,n,r-1);i&&t.push(i)}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function ca(e,t,n,r,i,a,o){let s=e.geometry.attributes.position;if(ea.fromBufferAttribute(s,i),ta.fromBufferAttribute(s,a),n.distanceSqToSegment(ea,ta,aa,oa)>r)return;aa.applyMatrix4(e.matrixWorld);let c=t.ray.origin.distanceTo(aa);if(!(c<t.near||c>t.far))return{distance:c,point:oa.clone().applyMatrix4(e.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:e}}var la=new K,ua=new K,da=class extends sa{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)la.fromBufferAttribute(t,e),ua.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+la.distanceTo(ua);e.setAttribute(`lineDistance`,new si(n,1))}else U(`LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},fa=class extends Ln{constructor(e=[],t=301,n,r,i,a,o,s,c,l){super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},pa=class extends Ln{constructor(e,t,n=Le,r,i,a,o=Ee,s=Ee,c,l=Je,u=1){if(l!==1026&&l!==1027)throw Error(`THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);super({width:e,height:t,depth:u},r,i,a,o,s,l,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Nn(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return t.compareFunction=this.compareFunction,t}},ma=class extends pa{constructor(e,t=Le,n=301,r,i,a=Ee,o=Ee,s,c=Je){let l={width:e,height:e,depth:1},u=[l,l,l,l,l,l];super(e,e,t,n,r,i,a,o,s,c),this.image=u,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},ha=class extends Ln{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},ga=class e extends yi{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new si(c,3)),this.setAttribute(`normal`,new si(l,3)),this.setAttribute(`uv`,new si(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new K;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}},_a=class e extends yi{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new si(p,3)),this.setAttribute(`normal`,new si(m,3)),this.setAttribute(`uv`,new si(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}};function va(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];if(ba(i))i.isRenderTargetTexture?(U(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone();else if(Array.isArray(i)){if(ba(i[0])){let e=[];for(let t=0,n=i.length;t<n;t++)e[t]=i[t].clone();t[n][r]=e}else t[n][r]=i.slice()}else t[n][r]=i}}return t}function ya(e){let t={};for(let n=0;n<e.length;n++){let r=va(e[n]);for(let e in r)t[e]=r[e]}return t}function ba(e){return e&&(e.isColor||e.isMatrix3||e.isMatrix4||e.isVector2||e.isVector3||e.isVector4||e.isTexture||e.isQuaternion)}function xa(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function Sa(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:J.workingColorSpace}var Ca={clone:va,merge:ya},wa=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Ta=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Ea=class extends Ti{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=wa,this.fragmentShader=Ta,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=va(e.uniforms),this.uniformsGroups=xa(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let r=e.uniforms[n];switch(this.uniforms[n]={},r.type){case`t`:this.uniforms[n].value=t[r.value]||null;break;case`c`:this.uniforms[n].value=new Y().setHex(r.value);break;case`v2`:this.uniforms[n].value=new bn().fromArray(r.value);break;case`v3`:this.uniforms[n].value=new K().fromArray(r.value);break;case`v4`:this.uniforms[n].value=new Rn().fromArray(r.value);break;case`m3`:this.uniforms[n].value=new q().fromArray(r.value);break;case`m4`:this.uniforms[n].value=new Un().fromArray(r.value);break;default:this.uniforms[n].value=r.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let t in e.extensions)this.extensions[t]=e.extensions[t];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Da=class extends Ea{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type=`RawShaderMaterial`}},Oa=class extends Ti{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=Wt,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ka=class extends Ti{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Aa(e,t){return!e||e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function ja(e){return e!==void 0&&e.inTangents!==void 0&&e.outTangents!==void 0}var Ma=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`THREE.Interpolant: Call to abstract method.`)}intervalChanged_(){}},Na=class extends Ma{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Vt,endingEnd:Vt}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case Ht:i=e,o=2*t-n;break;case Ut:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case Ht:a=e,s=2*n-t;break;case Ut:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},Pa=class extends Ma{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},Fa=class extends Ma{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},Ia=class extends Ma{interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this.inTangents,u=this.outTangents;if(!l||!u){let e=(n-t)/(r-t),l=1-e;for(let t=0;t!==o;++t)i[t]=a[c+t]*l+a[s+t]*e;return i}let d=o*2,f=e-1;for(let p=0;p!==o;++p){let o=a[c+p],m=a[s+p],h=f*d+p*2,g=u[h],_=u[h+1],v=e*d+p*2,y=l[v],b=l[v+1],x=za(n,t,g,y,r);i[p]=La(x,o,_,b,m)}return i}};function La(e,t,n,r,i){let a=1-e;return a*a*a*t+3*a*a*e*n+3*a*e*e*r+e*e*e*i}function Ra(e,t,n,r,i){let a=1-e;return 3*a*a*(n-t)+6*a*e*(r-n)+3*e*e*(i-r)}function za(e,t,n,r,i){let a=(e-t)/(i-t);for(let o=0;o<8;o++){let o=La(a,t,n,r,i)-e;if(Math.abs(o)<1e-10)break;let s=Ra(a,t,n,r,i);if(Math.abs(s)<1e-10)break;a=Math.max(0,Math.min(1,a-o/s))}return a}var Ba=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=Aa(t,this.TimeBufferType),this.values=Aa(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Aa(e.times,Array),values:Aa(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t),ja(e.settings)&&(n.settings={inTangents:Aa(e.settings.inTangents,Array),outTangents:Aa(e.settings.outTangents,Array)})}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Fa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Pa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Na(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Ia(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case Lt:t=this.InterpolantFactoryMethodDiscrete;break;case Rt:t=this.InterpolantFactoryMethodLinear;break;case zt:t=this.InterpolantFactoryMethodSmooth;break;case Bt:t=this.InterpolantFactoryMethodBezier}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return U(`KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Lt;case this.InterpolantFactoryMethodLinear:return Rt;case this.InterpolantFactoryMethodSmooth:return zt;case this.InterpolantFactoryMethodBezier:return Bt}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e;ja(this.settings)&&(Va(this.settings.inTangents,e),Va(this.settings.outTangents,e))}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e;ja(this.settings)&&(Ha(this.settings.inTangents,e),Ha(this.settings.outTangents,e))}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(W(`KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(W(`KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){W(`KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){W(`KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&$t(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){W(`KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===zt,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,ja(this.settings)&&(r.settings={inTangents:this.settings.inTangents.slice(),outTangents:this.settings.outTangents.slice()}),r}};function Va(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]+=t}function Ha(e,t){for(let n=0,r=e.length;n!==r;n+=2)e[n]*=t}Ba.prototype.ValueTypeName=``,Ba.prototype.TimeBufferType=Float32Array,Ba.prototype.ValueBufferType=Float32Array,Ba.prototype.DefaultInterpolation=Rt;var Ua=class extends Ba{constructor(e,t,n){super(e,t,n)}};Ua.prototype.ValueTypeName=`bool`,Ua.prototype.ValueBufferType=Array,Ua.prototype.DefaultInterpolation=Lt,Ua.prototype.InterpolantFactoryMethodLinear=void 0,Ua.prototype.InterpolantFactoryMethodSmooth=void 0;var Wa=class extends Ba{constructor(e,t,n,r){super(e,t,n,r)}};Wa.prototype.ValueTypeName=`color`;var Ga=class extends Ba{constructor(e,t,n,r){super(e,t,n,r)}};Ga.prototype.ValueTypeName=`number`;var Ka=class extends Ma{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)xn.slerpFlat(i,0,a,c-o,a,c,s);return i}},qa=class extends Ba{constructor(e,t,n,r){super(e,t,n,r)}InterpolantFactoryMethodLinear(e){return new Ka(this.times,this.values,this.getValueSize(),e)}};qa.prototype.ValueTypeName=`quaternion`,qa.prototype.InterpolantFactoryMethodSmooth=void 0;var Ja=class extends Ba{constructor(e,t,n){super(e,t,n)}};Ja.prototype.ValueTypeName=`string`,Ja.prototype.ValueBufferType=Array,Ja.prototype.DefaultInterpolation=Lt,Ja.prototype.InterpolantFactoryMethodLinear=void 0,Ja.prototype.InterpolantFactoryMethodSmooth=void 0;var Ya=class extends Ba{constructor(e,t,n,r){super(e,t,n,r)}};Ya.prototype.ValueTypeName=`vector`;var Xa=new K,Za=new xn,Qa=new K,$a=class extends gr{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new Un,this.projectionMatrix=new Un,this.projectionMatrixInverse=new Un,this.coordinateSystem=Zt,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Xa,Za,Qa),Qa.x===1&&Qa.y===1&&Qa.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xa,Za,Qa.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Xa,Za,Qa),Qa.x===1&&Qa.y===1&&Qa.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Xa,Za,Qa.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},eo=new K,to=new bn,no=new bn,ro=class extends $a{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=fn*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(dn*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return fn*2*Math.atan(Math.tan(dn*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){eo.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(eo.x,eo.y).multiplyScalar(-e/eo.z),eo.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(eo.x,eo.y).multiplyScalar(-e/eo.z)}getViewSize(e,t){return this.getViewBounds(e,to,no),t.subVectors(no,to)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(dn*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},io=class extends $a{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},ao=-90,oo=1,so=class extends gr{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new ro(ao,oo,e,t);r.layers=this.layers,this.add(r);let i=new ro(ao,oo,e,t);i.layers=this.layers,this.add(i);let a=new ro(ao,oo,e,t);a.layers=this.layers,this.add(a);let o=new ro(ao,oo,e,t);o.layers=this.layers,this.add(o);let s=new ro(ao,oo,e,t);s.layers=this.layers,this.add(s);let c=new ro(ao,oo,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.mipmapsAutoUpdate;n.texture.mipmapsAutoUpdate=!1;let h=!1;h=e.isWebGLRenderer===!0?e.state.buffers.depth.getReversed():e.reversedDepthBuffer,e.setRenderTarget(n,0,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,i),e.setRenderTarget(n,1,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,s),e.setRenderTarget(n,4,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.mipmapsAutoUpdate=m,e.setRenderTarget(n,5,r),h&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},co=class extends ro{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e,this.perCameraFrustumCulled=!1}},lo=`\\[\\]\\.:\\/`,uo=RegExp(`[\\[\\]\\.:\\/]`,`g`),fo=`[^\\[\\]\\.:\\/]`,po=`[^`+lo.replace(`\\.`,``)+`]`,mo=`((?:WC+[\\/:])*)`.replace(`WC`,fo),ho=`(WCOD+)?`.replace(`WCOD`,po),go=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,fo),_o=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,fo),vo=RegExp(`^`+mo+ho+go+_o+`$`),yo=[`material`,`materials`,`bones`,`map`],bo=class{constructor(e,t,n){let r=n||xo.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},xo=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(uo,``)}static parseTrackName(e){let t=vo.exec(e);if(t===null)throw Error(`THREE.PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);yo.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`THREE.PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){U(`PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){W(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){W(`PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){W(`PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){W(`PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){W(`PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){W(`PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){W(`PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;W(`PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.isMaterial===!0?s=this.Versioning.NeedsUpdate:t.isObject3D===!0&&(s=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){W(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){W(`PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};xo.Composite=bo,xo.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},xo.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},xo.prototype.GetterByBindingType=[xo.prototype._getValue_direct,xo.prototype._getValue_array,xo.prototype._getValue_arrayElement,xo.prototype._getValue_toArray],xo.prototype.SetterByBindingTypeAndVersioning=[[xo.prototype._setValue_direct,xo.prototype._setValue_direct_setNeedsUpdate,xo.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[xo.prototype._setValue_array,xo.prototype._setValue_array_setNeedsUpdate,xo.prototype._setValue_array_setMatrixWorldNeedsUpdate],[xo.prototype._setValue_arrayElement,xo.prototype._setValue_arrayElement_setNeedsUpdate,xo.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[xo.prototype._setValue_fromArray,xo.prototype._setValue_fromArray_setNeedsUpdate,xo.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]],class{static{this.prototype.isMatrix2=!0}constructor(e,t,n,r){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,r)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,r){let i=this.elements;return i[0]=e,i[2]=t,i[1]=n,i[3]=r,this}};function So(e,t,n,r){let i=Co(r);switch(n){case Ge:return e*t;case Xe:return e*t/i.components*i.byteLength;case Ze:return e*t/i.components*i.byteLength;case Qe:return e*t*2/i.components*i.byteLength;case $e:return e*t*2/i.components*i.byteLength;case Ke:return e*t*3/i.components*i.byteLength;case qe:return e*t*4/i.components*i.byteLength;case et:return e*t*4/i.components*i.byteLength;case tt:case nt:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case rt:case it:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case ot:case ct:return Math.max(e,16)*Math.max(t,8)/4;case at:case st:return Math.max(e,8)*Math.max(t,8)/2;case lt:case ut:case ft:case pt:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*8;case dt:case mt:case ht:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case gt:return Math.floor((e+3)/4)*Math.floor((t+3)/4)*16;case _t:return Math.floor((e+4)/5)*Math.floor((t+3)/4)*16;case vt:return Math.floor((e+4)/5)*Math.floor((t+4)/5)*16;case yt:return Math.floor((e+5)/6)*Math.floor((t+4)/5)*16;case bt:return Math.floor((e+5)/6)*Math.floor((t+5)/6)*16;case xt:return Math.floor((e+7)/8)*Math.floor((t+4)/5)*16;case St:return Math.floor((e+7)/8)*Math.floor((t+5)/6)*16;case Ct:return Math.floor((e+7)/8)*Math.floor((t+7)/8)*16;case wt:return Math.floor((e+9)/10)*Math.floor((t+4)/5)*16;case Tt:return Math.floor((e+9)/10)*Math.floor((t+5)/6)*16;case Et:return Math.floor((e+9)/10)*Math.floor((t+7)/8)*16;case Dt:return Math.floor((e+9)/10)*Math.floor((t+9)/10)*16;case Ot:return Math.floor((e+11)/12)*Math.floor((t+9)/10)*16;case kt:return Math.floor((e+11)/12)*Math.floor((t+11)/12)*16;case At:case jt:case Mt:return Math.ceil(e/4)*Math.ceil(t/4)*16;case Nt:case Pt:return Math.ceil(e/4)*Math.ceil(t/4)*8;case Ft:case It:return Math.ceil(e/4)*Math.ceil(t/4)*16}throw Error(`Unable to determine texture byte length for ${n} format.`)}function Co(e){switch(e){case Me:case Ne:return{byteLength:1,components:1};case Fe:case Pe:case ze:return{byteLength:2,components:1};case Be:case Ve:return{byteLength:2,components:4};case Le:case Ie:case Re:return{byteLength:4,components:1};case Ue:case We:return{byteLength:4,components:3}}throw Error(`THREE.TextureUtils: Unknown texture type ${e}.`)}typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`187`}})),typeof window<`u`&&(window.__THREE__?U(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`187`);function wo(){let e=null,t=!1,n=null,r=null;function i(t,a){r=e.requestAnimationFrame(i),n(t,a)}return{start:function(){t!==!0&&n!==null&&e!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e!==null&&e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function To(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(typeof Float16Array<`u`&&r instanceof Float16Array)s=e.HALF_FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n.updateRanges;if(e.bindBuffer(r,t),a.length===0)e.bufferSubData(r,0,i);else{a.sort((e,t)=>e.start-t.start);let t=0;for(let e=1;e<a.length;e++){let n=a[t],r=a[e];r.start<=n.start+n.count+1?n.count=Math.max(n.count,r.start+r.count-n.start):(++t,a[t]=r)}a.length=t+1;for(let t=0,n=a.length;t<n;t++){let n=a[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isInterleavedBufferAttribute&&(e=e.data),e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var X={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	uniform samplerCube envMap;
	#ifdef ENVMAP_TYPE_PMREM
		float roughnessToMip( const in float roughness ) {
			float r = clamp( roughness, 0.0, 1.0 );
			return ENVMAP_MAX_LOD * r * ( 2.0 - r );
		}
	#endif
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * worldNormal, ENVMAP_MAX_LOD );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_PMREM
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureLod( envMap, envMapRotation * reflectVec, roughnessToMip( roughness ) );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_RETROREFLECTION
		vec3 getIBLRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 retroVec = normalize( mix( viewDir, normal, pow4( roughness ) ) );
				retroVec = transformDirectionByInverseViewMatrix( retroVec, viewMatrix );
				vec4 envMapColor = textureLod( envMap, envMapRotation * retroVec, roughnessToMip( roughness ) );
				return envMapColor.rgb * envMapIntensity;
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_PMREM
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
		#ifdef USE_RETROREFLECTION
			vec3 getIBLAnisotropyRetroRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
				#ifdef ENVMAP_TYPE_PMREM
					vec3 bentNormal = cross( bitangent, viewDir );
					bentNormal = normalize( cross( bentNormal, bitangent ) );
					bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
					return getIBLRetroRadiance( viewDir, bentNormal, roughness );
				#else
					return vec3( 0.0 );
				#endif
			}
		#endif
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_SUN_LIGHTS > 0
	struct SunLight {
		vec3 direction;
		vec3 color;
	};
	uniform SunLight sunLights[ NUM_SUN_LIGHTS ];
	void getSunLightInfo( const in SunLight sunLight, out IncidentLight light ) {
		light.color = sunLight.color;
		light.direction = sunLight.direction;
		light.visible = true;
	}
#endif
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.045 );
material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef USE_DIFFUSE_ROUGHNESS
	float diffuseRoughnessFactor = diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		diffuseRoughnessFactor *= texture2D( diffuseRoughnessMap, vDiffuseRoughnessMapUv ).r;
	#endif
	material.diffuseRoughness = saturate( diffuseRoughnessFactor );
#endif
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.045 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_RETROREFLECTION
	material.retroreflectivity = retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	vec2 dfg;
	vec3 multiScatteringCompensation;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float diffuseRoughness;
	#endif
	#ifdef USE_RETROREFLECTION
		float retroreflectivity;
	#endif
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0Dielectric;
		vec3 iridescenceF0Metallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
#ifdef USE_DIFFUSE_ROUGHNESS
	const float EON_EPSILON = 1e-7;
	float FON_DirectionalAlbedo( const in float mu, const in float roughness, const in float A ) {
		float muComp = 1.0 - mu;
		float gOverPi = muComp * ( 0.0571085289 + muComp * ( 0.491881867 + muComp * ( - 0.332181442 + muComp * 0.0714429953 ) ) );
		return A * ( 1.0 + roughness * gOverPi );
	}
	vec3 BRDF_EON( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 diffuseColor, const in float roughness ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return BRDF_Lambert( rho );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float s = dot( lightDir, viewDir ) - dotNL * dotNV;
		float sOverT = ( s > 0.0 ) ? s / max( max( dotNL, dotNV ), EON_EPSILON ) : s;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		vec3 singleScatter = rho * RECIPROCAL_PI * A * ( 1.0 + roughness * sOverT );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		float albedoV = FON_DirectionalAlbedo( dotNV, roughness, A );
		float albedoL = FON_DirectionalAlbedo( dotNL, roughness, A );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		vec3 multiScatter = rhoMultiScatter * RECIPROCAL_PI
			* max( EON_EPSILON, 1.0 - albedoV )
			* max( EON_EPSILON, 1.0 - albedoL )
			/ max( EON_EPSILON, 1.0 - averageAlbedo );
		return singleScatter + multiScatter;
	}
	vec3 EON_DirectionalAlbedo( const in vec3 diffuseColor, const in float roughness, const in float dotNV ) {
		vec3 rho = saturate( diffuseColor );
		if ( roughness <= EON_EPSILON ) return rho;
		float A = 1.0 / ( 1.0 + ( 0.5 - 2.0 / ( 3.0 * PI ) ) * roughness );
		float directionalAlbedo = FON_DirectionalAlbedo( dotNV, roughness, A );
		float averageAlbedo = A * ( 1.0 + ( 2.0 / 3.0 - 28.0 / ( 15.0 * PI ) ) * roughness );
		vec3 rhoMultiScatter = rho * rho * averageAlbedo / max( vec3( EON_EPSILON ), vec3( 1.0 ) - rho * ( 1.0 - averageAlbedo ) );
		return rho * directionalAlbedo + rhoMultiScatter * ( 1.0 - directionalAlbedo );
	}
#endif
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = max( material.clearcoatRoughness, 0.045 );
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = max( material.roughness, 0.045 );
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float alphaT = max( material.alphaT, alpha );
		float V = V_GGX_SmithCorrelated_Anisotropic( alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec2 fab, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec2 fab, const in vec3 specularColor, const in float specularF90, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	vec3 specularBRDF = BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	#ifdef USE_RETROREFLECTION
		vec3 retroViewDir = reflect( - geometryViewDir, geometryNormal );
		vec3 retroSpecularBRDF = BRDF_GGX( directLight.direction, retroViewDir, geometryNormal, material );
		specularBRDF = mix( specularBRDF, retroSpecularBRDF, saturate( material.retroreflectivity ) );
	#endif
	reflectedLight.directSpecular += irradiance * specularBRDF * material.multiScatteringCompensation;
	vec3 halfDir = normalize( directLight.direction + geometryViewDir );
	float dotVH = saturate( dot( geometryViewDir, halfDir ) );
	vec3 F = F_Schlick( material.specularColor, material.specularF90, dotVH );
	#ifdef USE_RETROREFLECTION
		vec3 retroHalfDir = normalize( directLight.direction + retroViewDir );
		float dotRetroVH = saturate( dot( retroViewDir, retroHalfDir ) );
		vec3 retroF = F_Schlick( material.specularColor, material.specularF90, dotRetroVH );
		F = mix( F, retroF, saturate( material.retroreflectivity ) );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		vec3 diffuseBRDF = BRDF_EON( directLight.direction, geometryViewDir, geometryNormal, material.diffuseColor, material.diffuseRoughness ) * ( 1.0 - material.metalness );
	#else
		vec3 diffuseBRDF = BRDF_Lambert( material.diffuseContribution );
	#endif
	reflectedLight.directDiffuse += irradiance * diffuseBRDF * ( 1.0 - F );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScattering, multiScattering );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScattering, multiScattering );
	#endif
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuseAlbedo = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness );
		vec3 diffuse = irradiance * RECIPROCAL_PI * diffuseAlbedo * ( 1.0 - singleScattering - multiScattering );
	#else
		vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution ) * ( 1.0 - singleScattering - multiScattering );
	#endif
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		sheenSpecularIndirect += irradiance * material.sheenColor * sheenAlbedo * RECIPROCAL_PI;
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( material.dfg, material.specularColor, material.specularF90, material.iridescence, material.iridescenceF0Dielectric, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( material.dfg, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceF0Metallic, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( material.dfg, material.specularColor, material.specularF90, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( material.dfg, material.diffuseColor, material.specularF90, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	#ifdef USE_DIFFUSE_ROUGHNESS
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		vec3 diffuse = EON_DirectionalAlbedo( material.diffuseColor, material.diffuseRoughness, dotNV ) * ( 1.0 - material.metalness ) * ( 1.0 - totalScatteringDielectric );
	#else
		vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	#endif
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		vec3 iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		vec3 iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( iridescenceFresnelDielectric, iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0Dielectric = Schlick_to_F0( iridescenceFresnelDielectric, 1.0, dotNVi );
		material.iridescenceF0Metallic = Schlick_to_F0( iridescenceFresnelMetallic, 1.0, dotNVi );
	}
#endif
#ifdef STANDARD
	float dotNVms = saturate( dot( geometryNormal, geometryViewDir ) );
	material.dfg = texture2D( dfgLUT, vec2( material.roughness, dotNVms ) ).rg;
	#if ( NUM_SUN_LIGHTS > 0 || NUM_DIR_LIGHTS > 0 || NUM_POINT_LIGHTS > 0 || NUM_SPOT_LIGHTS > 0 )
		float EssMs = material.dfg.x + material.dfg.y;
		material.multiScatteringCompensation = 1.0 + material.specularColorBlended * ( 1.0 / EssMs - 1.0 );
	#endif
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SUN_LIGHTS > 0 ) && defined( RE_Direct )
	SunLight sunLight;
	#if defined( USE_SHADOWMAP ) && NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHTS; i ++ ) {
		sunLight = sunLights[ i ];
		getSunLightInfo( sunLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SUN_LIGHT_SHADOWS )
		sunLightShadow = sunLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getSunShadow( sunShadowMap[ i ], sunLightShadow, UNROLLED_LOOP_INDEX ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_LIGHT_PROBE_GRIDS > 0
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		int probeGrid = - 1;
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( isInsideLightProbeGrid( probeWorldPos, probeWorldNormal, probesMin[ i ], probesMax[ i ], probesResolution[ i ] ) ) probeGrid = UNROLLED_LOOP_INDEX;
		}
		#pragma unroll_loop_end
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_LIGHT_PROBE_GRIDS; i ++ ) {
			if ( probeGrid == UNROLLED_LOOP_INDEX ) irradiance += getLightProbeGridIrradiance( probesSH[ i ], probesMin[ i ], probesMax[ i ], probesResolution[ i ], probeWorldPos, probeWorldNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_PMREM )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		vec3 iblRadiance = getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		vec3 iblRadiance = getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_RETROREFLECTION
		#ifdef USE_ANISOTROPY
			vec3 retroIBLRadiance = getIBLAnisotropyRetroRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
		#else
			vec3 retroIBLRadiance = getIBLRetroRadiance( geometryViewDir, geometryNormal, material.roughness );
		#endif
		iblRadiance = mix( iblRadiance, retroIBLRadiance, saturate( material.retroreflectivity ) );
	#endif
	radiance += iblRadiance;
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,lightprobes_pars_fragment:`#if NUM_LIGHT_PROBE_GRIDS > 0
uniform highp sampler3D probesSH[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMin[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesMax[ NUM_LIGHT_PROBE_GRIDS ];
uniform vec3 probesResolution[ NUM_LIGHT_PROBE_GRIDS ];
bool isInsideLightProbeGrid( vec3 worldPos, vec3 worldNormal, vec3 probesMin, vec3 probesMax, vec3 probesResolution ) {
	vec3 spacing = ( probesMax - probesMin ) / probesResolution;
	vec3 samplePos = worldPos + worldNormal * spacing * 0.5;
	vec3 margin = spacing * 0.01;
	return all( greaterThanEqual( samplePos, probesMin - margin ) ) && all( lessThanEqual( samplePos, probesMax + margin ) );
}
vec3 getLightProbeGridIrradiance( highp sampler3D probesSH, vec3 probesMin, vec3 probesMax, vec3 probesResolution, vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 probeSpacing = gridRange / res;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.5 / res, 1.0 - 0.5 / res );
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS )
	#if defined( USE_COLOR_ALPHA )
		vColor *= morphTargetBaseInfluence;
	#elif defined( USE_COLOR )
		vColor.rgb *= morphTargetBaseInfluence;
	#endif
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor.rgb += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		#define SUN_LIGHT_CASCADES 2
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#else
			uniform sampler2D sunShadowMap[ NUM_SUN_LIGHT_SHADOWS ];
		#endif
		uniform mat4 sunShadowMatrix[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		uniform vec4 sunShadowCascade[ NUM_SUN_LIGHT_SHADOWS * SUN_LIGHT_CASCADES ];
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
		struct SunLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SunLightShadow sunLightShadows[ NUM_SUN_LIGHT_SHADOWS ];
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				vec2 radius = shadowRadius * texelSize;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_SUN_LIGHT_SHADOWS > 0
		float getSunShadow(
			#if defined( SHADOWMAP_TYPE_PCF )
				sampler2DShadow shadowMap,
			#else
				sampler2D shadowMap,
			#endif
			SunLightShadow sunLightShadow,
			int shadowIndex
		) {
			vec4 shadowWorldPosition = vec4( vSunShadowWorldPosition.xyz + vSunShadowWorldNormal * sunLightShadow.shadowNormalBias, 1.0 );
			float viewDepth = vSunShadowWorldPosition.w;
			int cascadeOffset = shadowIndex * SUN_LIGHT_CASCADES;
			float shadow = 1.0;
			for ( int i = SUN_LIGHT_CASCADES - 1; i >= 0; i -- ) {
				vec4 cascade = sunShadowCascade[ cascadeOffset + i ];
				if ( viewDepth >= cascade.x && viewDepth < cascade.y ) {
					float cascadeShadow = getShadow(
						shadowMap,
						sunLightShadow.shadowMapSize,
						sunLightShadow.shadowIntensity,
						sunLightShadow.shadowBias,
						sunLightShadow.shadowRadius,
						sunShadowMatrix[ cascadeOffset + i ] * shadowWorldPosition
					);
					shadow = mix( cascadeShadow, shadow, smoothstep( cascade.z, cascade.y, viewDepth ) );
				}
			}
			return shadow;
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float lightDistance = length( lightToPosition );
			float depthRange = shadowCameraFar - shadowCameraNear;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float depthA = - shadowCameraNear / depthRange - shadowBias;
				float depthB = shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#else
				float depthA = shadowCameraFar / depthRange + shadowBias;
				float depthB = - shadowCameraNear * shadowCameraFar / ( depthRange * lightDistance );
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			shadow = 0.0;
			for ( int i = 0; i < 5; i ++ ) {
				vec2 offset = vogelDiskSample( i, 5, phi );
				vec3 direction = bd3D + ( tangent * offset.x + bitangent * offset.y ) * texelSize;
				vec3 absDirection = abs( direction );
				float dp = depthA + depthB / max( max( absDirection.x, absDirection.y ), absDirection.z );
				shadow += texture( shadowMap, vec4( direction, dp ) );
			}
			shadow *= 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
		varying vec4 vSunShadowWorldPosition;
		varying vec3 vSunShadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SUN_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_SUN_LIGHT_SHADOWS > 0
		vSunShadowWorldPosition = vec4( worldPosition.xyz, - mvPosition.z );
		vSunShadowWorldNormal = shadowWorldNormal;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_SUN_LIGHT_SHADOWS > 0
	SunLightShadow sunLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SUN_LIGHT_SHADOWS; i ++ ) {
		sunLight = sunLightShadows[ i ];
		shadow *= receiveShadow ? getSunShadow( sunShadowMap[ i ], sunLight, UNROLLED_LOOP_INDEX ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	uniform mat3 diffuseRoughnessMapTransform;
	varying vec2 vDiffuseRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DIFFUSE_ROUGHNESSMAP
	vDiffuseRoughnessMapUv = ( diffuseRoughnessMapTransform * vec3( DIFFUSE_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <envmap_common_pars_fragment>
void main() {
	#ifdef ENVMAP_TYPE_PMREM
		vec4 texColor = textureLod( envMap, backgroundRotation * vWorldDirection, roughnessToMip( backgroundBlurriness ) );
	#else
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,distance_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distance_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DIFFUSE_ROUGHNESS
	uniform float diffuseRoughness;
	#ifdef USE_DIFFUSE_ROUGHNESSMAP
		uniform sampler2D diffuseRoughnessMap;
	#endif
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_RETROREFLECTION
	uniform float retroreflectivity;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},Z={common:{diffuse:{value:new Y(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new q}},envmap:{envMap:{value:null},envMapRotation:{value:new q},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new q}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new q}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new q},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new q},normalScale:{value:new bn(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new q},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new q}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new q}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new q}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Y(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},sunLights:{value:[],properties:{direction:{},color:{}}},sunLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},sunShadowMatrix:{value:[]},sunShadowCascade:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:[]},probesMin:{value:[]},probesMax:{value:[]},probesResolution:{value:[]}},points:{diffuse:{value:new Y(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0},uvTransform:{value:new q}},sprite:{diffuse:{value:new Y(16777215)},opacity:{value:1},center:{value:new bn(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new q},alphaMap:{value:null},alphaMapTransform:{value:new q},alphaTest:{value:0}}},Eo={basic:{uniforms:ya([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.fog]),vertexShader:X.meshbasic_vert,fragmentShader:X.meshbasic_frag},lambert:{uniforms:ya([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new Y(0)},envMapIntensity:{value:1}}]),vertexShader:X.meshlambert_vert,fragmentShader:X.meshlambert_frag},phong:{uniforms:ya([Z.common,Z.specularmap,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,Z.lights,{emissive:{value:new Y(0)},specular:{value:new Y(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:X.meshphong_vert,fragmentShader:X.meshphong_frag},standard:{uniforms:ya([Z.common,Z.envmap,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.roughnessmap,Z.metalnessmap,Z.fog,Z.lights,{emissive:{value:new Y(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag},toon:{uniforms:ya([Z.common,Z.aomap,Z.lightmap,Z.emissivemap,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.gradientmap,Z.fog,Z.lights,{emissive:{value:new Y(0)}}]),vertexShader:X.meshtoon_vert,fragmentShader:X.meshtoon_frag},matcap:{uniforms:ya([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,Z.fog,{matcap:{value:null}}]),vertexShader:X.meshmatcap_vert,fragmentShader:X.meshmatcap_frag},points:{uniforms:ya([Z.points,Z.fog]),vertexShader:X.points_vert,fragmentShader:X.points_frag},dashed:{uniforms:ya([Z.common,Z.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:X.linedashed_vert,fragmentShader:X.linedashed_frag},depth:{uniforms:ya([Z.common,Z.displacementmap]),vertexShader:X.depth_vert,fragmentShader:X.depth_frag},normal:{uniforms:ya([Z.common,Z.bumpmap,Z.normalmap,Z.displacementmap,{opacity:{value:1}}]),vertexShader:X.meshnormal_vert,fragmentShader:X.meshnormal_frag},sprite:{uniforms:ya([Z.sprite,Z.fog]),vertexShader:X.sprite_vert,fragmentShader:X.sprite_frag},background:{uniforms:{uvTransform:{value:new q},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:X.background_vert,fragmentShader:X.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new q}},vertexShader:X.backgroundCube_vert,fragmentShader:X.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:X.cube_vert,fragmentShader:X.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:X.equirect_vert,fragmentShader:X.equirect_frag},distance:{uniforms:ya([Z.common,Z.displacementmap,{referencePosition:{value:new K},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:X.distance_vert,fragmentShader:X.distance_frag},shadow:{uniforms:ya([Z.lights,Z.fog,{color:{value:new Y(0)},opacity:{value:1}}]),vertexShader:X.shadow_vert,fragmentShader:X.shadow_frag}};Eo.physical={uniforms:ya([Eo.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new q},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new q},clearcoatNormalScale:{value:new bn(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new q},diffuseRoughness:{value:0},diffuseRoughnessMap:{value:null},diffuseRoughnessMapTransform:{value:new q},dispersion:{value:0},retroreflectivity:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new q},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new q},sheen:{value:0},sheenColor:{value:new Y(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new q},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new q},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new q},transmissionSamplerSize:{value:new bn},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new q},attenuationDistance:{value:0},attenuationColor:{value:new Y(0)},specularColor:{value:new Y(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new q},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new q},anisotropyVector:{value:new bn},anisotropyMap:{value:null},anisotropyMapTransform:{value:new q}}]),vertexShader:X.meshphysical_vert,fragmentShader:X.meshphysical_frag};var Do={r:0,b:0,g:0},Oo=new Un,ko=new q;ko.set(-1,0,0,0,1,0,0,0,1);function Ao(e,t,n,r,i,a){let o=new Y(0),s=i===!0?0:1,c,l,u=null,d=0,f=null;function p(e){let n=e.isScene===!0?e.background:null;if(n&&n.isTexture){let r=e.backgroundBlurriness>0;n=t.get(n,r)}return n}function m(t){let r=!1,i=p(t);i===null?g(o,s):i&&i.isColor&&(g(i,1),r=!0);let c=e.xr.getEnvironmentBlendMode();c===`additive`?n.buffers.color.setClear(0,0,0,1,a):c===`alpha-blend`&&n.buffers.color.setClear(0,0,0,0,a),(e.autoClear||r)&&(n.buffers.depth.setTest(!0),n.buffers.depth.setMask(!0),n.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function h(t,n){let i=p(n);i&&i.isCubeTexture?(l===void 0&&(l=new Ui(new ga(1,1,1),new Ea({name:`BackgroundCubeMaterial`,uniforms:va(Eo.backgroundCube.uniforms),vertexShader:Eo.backgroundCube.vertexShader,fragmentShader:Eo.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute(`normal`),l.geometry.deleteAttribute(`uv`),l.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),r.update(l)),l.material.uniforms.envMap.value=i,l.material.uniforms.backgroundBlurriness.value=n.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(Oo.makeRotationFromEuler(n.backgroundRotation)).transpose(),i.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(ko),l.material.toneMapped=J.getTransfer(i.colorSpace)!==Jt,(u!==i||d!==i.version||f!==e.toneMapping)&&(l.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),l.layers.enableAll(),t.unshift(l,l.geometry,l.material,0,0,null)):i&&i.isTexture&&(c===void 0&&(c=new Ui(new _a(2,2),new Ea({name:`BackgroundMaterial`,uniforms:va(Eo.background.uniforms),vertexShader:Eo.background.vertexShader,fragmentShader:Eo.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute(`normal`),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),r.update(c)),c.material.uniforms.t2D.value=i,c.material.uniforms.backgroundIntensity.value=n.backgroundIntensity,c.material.toneMapped=J.getTransfer(i.colorSpace)!==Jt,i.matrixAutoUpdate===!0&&i.updateMatrix(),c.material.uniforms.uvTransform.value.copy(i.matrix),(u!==i||d!==i.version||f!==e.toneMapping)&&(c.material.needsUpdate=!0,u=i,d=i.version,f=e.toneMapping),c.layers.enableAll(),t.unshift(c,c.geometry,c.material,0,0,null))}function g(t,r){t.getRGB(Do,Sa(e)),n.buffers.color.setClear(Do.r,Do.g,Do.b,r,a)}function _(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return o},setClearColor:function(e,t=1){o.set(e),s=t,g(o,s)},getClearAlpha:function(){return s},setClearAlpha:function(e){s=e,g(o,s)},render:m,addToRenderList:h,dispose:_}}function jo(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(n,s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n,i){let a=i.wireframe===!0,o=r[t.id];o===void 0&&(o={},r[t.id]=o);let s=e.isInstancedMesh===!0?e.id:0,l=o[s];l===void 0&&(l={},o[s]=l);let u=l[n.id];u===void 0&&(u={},l[n.id]=u);let d=u[a];return d===void 0&&(d=f(c()),u[a]=d),d}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.isInterleavedBuffer===!0?t.stride:t.itemSize,p=s.offset;if(t.isInstancedInterleavedBuffer||t.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){T();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n){let t=n[e];for(let e in t)u(t[e].object),delete t[e];delete n[e]}}delete r[e.id]}function C(e){for(let t in r){let n=r[t];for(let t in n){let r=n[t];if(r[e.id]===void 0)continue;let i=r[e.id];for(let e in i)u(i[e].object),delete i[e];delete r[e.id]}}}function w(e){for(let t in r){let n=r[t],i=e.isInstancedMesh===!0?e.id:0,a=n[i];if(a!==void 0){for(let e in a){let t=a[e];for(let e in t)u(t[e].object),delete t[e];delete a[e]}delete n[i],Object.keys(n).length===0&&delete r[t]}}}function T(){E(),o=!0,a!==i&&(a=i,l(a.object))}function E(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:T,resetDefaultState:E,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfObject:w,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function Mo(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;t.get(`WEBGL_multi_draw`).multiDrawArraysWEBGL(r,e,0,i,0,a);let o=0;for(let e=0;e<a;e++)o+=i[e];n.update(o,r,1)}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function No(e,t,n,r){let i;function a(){if(i!==void 0)return i;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);i=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function o(t){return t===1023||r.convert(t)===e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT)}function s(n){let i=n===1016&&(t.has(`EXT_color_buffer_half_float`)||t.has(`EXT_color_buffer_float`));return!(n!==1009&&n!==1015&&!i&&r.convert(n)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE))}function c(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let l=n.precision===void 0?`highp`:n.precision,u=c(l);u!==l&&(U(`WebGLRenderer:`,l,`not supported, using`,u,`instead.`),l=u);let d=n.reversedDepthBuffer===!0&&t.has(`EXT_clip_control`),f=n.logarithmicDepthBuffer===!0&&d===!1;n.reversedDepthBuffer===!0&&d===!1&&U(`WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.`),n.logarithmicDepthBuffer===!0&&d===!0&&U(`WebGLRenderer: Logarithmic depth buffer is ignored when reversed depth buffer is enabled.`);let p=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),m=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),h=e.getParameter(e.MAX_TEXTURE_SIZE),g=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),_=e.getParameter(e.MAX_VERTEX_ATTRIBS),v=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),y=e.getParameter(e.MAX_VARYING_VECTORS),b=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),x=e.getParameter(e.MAX_SAMPLES),S=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:a,getMaxPrecision:c,textureFormatReadable:o,textureTypeReadable:s,precision:l,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:p,maxVertexTextures:m,maxTextureSize:h,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:v,maxVaryings:y,maxFragmentUniforms:b,maxSamples:x,samples:S}}function Po(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Ci,s=new q,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}var Fo=class extends Bn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new fa(r),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new ga(5,5,5),i=new Ea({name:`CubemapFromEquirect`,uniforms:va(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new Ui(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=ke),new so(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,r=!0){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Io=256,Lo=3,Ro=20,zo=256,Bo=16,Vo=3,Ho=new K,Uo=new Y,Wo=class e{constructor(e){this._renderer=e,this._cubeSize=0,this._sourceTarget=null,this._cubeCamera=new so(1,10,null),this._boxMesh=new Ui(new ga(5,5,5),null),this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null,this._integrationMaterial=null}fromScene(e,t=0,n=.1,r=100,i={}){let{size:a=256,position:o=Ho}=i,s=this._renderer;this._setSize(a);let c=this._allocateTarget(),l=this._getSourceTarget(!0);t>0&&(l.texture.mipmapsAutoUpdate=!1);let u=s.autoClear,d=s.autoClearColor,f=s.autoClearDepth,p=s.autoClearStencil,m=e.background;s.autoClear=!0,s.autoClearColor=!0,s.autoClearDepth=!0,s.autoClearStencil=!0,m===null&&(e.background=s.getClearColor(Uo));let h=new so(n,r,l);return h.position.copy(o),h.update(s,e),s.autoClear=u,s.autoClearColor=d,s.autoClearDepth=f,s.autoClearStencil=p,e.background=m,t>0&&(l.texture.mipmapsAutoUpdate=!0,this._blur(c,t)),this._applyPMREM(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Zo(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Xo(),this._compileMaterial(this._equirectMaterial))}dispose(){this._sourceTarget!==null&&this._sourceTarget.dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._integrationMaterial!==null&&this._integrationMaterial.dispose(),this._boxMesh.geometry.dispose()}static lodToRoughness(e,t){return t>0?1-Math.sqrt(1-e/t):0}_setSize(e){this._cubeSize=Math.max(Io,gn(e))}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?Io:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4);let n=t||this._allocateTarget();return this._textureToCubemap(e),this._applyPMREM(n),n}_allocateTarget(){let e=this._cubeSize,t=Go(e,!1,!1),n=Math.log2(e)-Lo;for(let r=0;r<=n;r++)t.texture.mipmaps.push({width:e>>r,height:e>>r});return t.texture.name=`PMREM`,t.texture.isPMREMTexture=!0,t}_getSourceTarget(e=!1){let t=this._cubeSize,n=this._sourceTarget;return(n===null||n.width!==t||e&&n.depthBuffer===!1)&&(n!==null&&n.dispose(),this._sourceTarget=Go(t,!0,e)),this._sourceTarget}_compileMaterial(e){this._boxMesh.material=e,this._renderer.compile(this._boxMesh,this._cubeCamera.children[0])}_renderCube(e,t,n){let r=this._boxMesh,i=this._cubeCamera;r.material=n,i.renderTarget=e,i.activeMipmapLevel=t;let a=e.width>>t;e.viewport.set(0,0,a,a),i.update(this._renderer,r),e.viewport.set(0,0,e.width,e.height)}_textureToCubemap(e){let t;e.mapping===301||e.mapping===302?(this._cubemapMaterial===null&&(this._cubemapMaterial=Zo()),t=this._cubemapMaterial,t.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):(this._equirectMaterial===null&&(this._equirectMaterial=Xo()),t=this._equirectMaterial),t.uniforms.envMap.value=e,this._renderCube(this._getSourceTarget(),0,t)}_applyPMREM(t){this._ggxMaterial===null&&(this._ggxMaterial=qo(),this._integrationMaterial=Jo());let n=this._cubeSize,r=t.texture.mipmaps.length-1,i=this._ggxMaterial.uniforms;i.envMap.value=this._sourceTarget.texture;let a=this._integrationMaterial.uniforms;a.envMap.value=this._sourceTarget.texture,a.sourceLod.value=Math.log2(n/Bo);for(let o=0;o<=r;o++){let s=e.lodToRoughness(o,r);if(o>r-Vo)a.roughness.value=s,this._renderCube(t,o,this._integrationMaterial);else{let e=s>0?Math.log2(n)+.5*Math.log2(6/(zo*s**4))+.5:0;i.roughness.value=s,i.lodBias.value=e,this._renderCube(t,o,this._ggxMaterial)}}}_blur(e,t){this._blurMaterial===null&&(this._blurMaterial=Yo());let n=this._blurMaterial,r=n.uniforms,i=this._sourceTarget;r.sigma.value=Math.min(t,Math.PI)/Math.SQRT2,r.envMap.value=i.texture,this._renderCube(e,0,n),r.envMap.value=e.texture,this._renderCube(i,0,n)}};function Go(e,t,n){return new Fo(e,{minFilter:je,generateMipmaps:t,type:ze,colorSpace:Kt,depthBuffer:n})}function Ko(e,t,n){return new Ea({name:e,uniforms:t,vertexShader:X.cube_vert,fragmentShader:n,side:1,blending:0,depthTest:!1,depthWrite:!1})}function qo(){return Ko(`PMREMGGXConvolution`,{envMap:{value:null},roughness:{value:0},lodBias:{value:0}},`

		#define GGX_SAMPLES ${zo}u

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float lodBias;

		#include <common>

		// Van der Corput radical inverse
		float radicalInverse_VdC( uint bits ) {

			bits = ( bits << 16u ) | ( bits >> 16u );
			bits = ( ( bits & 0x55555555u ) << 1u ) | ( ( bits & 0xAAAAAAAAu ) >> 1u );
			bits = ( ( bits & 0x33333333u ) << 2u ) | ( ( bits & 0xCCCCCCCCu ) >> 2u );
			bits = ( ( bits & 0x0F0F0F0Fu ) << 4u ) | ( ( bits & 0xF0F0F0F0u ) >> 4u );
			bits = ( ( bits & 0x00FF00FFu ) << 8u ) | ( ( bits & 0xFF00FF00u ) >> 8u );
			return float( bits ) * 2.3283064365386963e-10; // / 0x100000000

		}

		// Hammersley sequence
		vec2 hammersley( uint i, uint N ) {

			return vec2( float( i ) / float( N ), radicalInverse_VdC( i ) );

		}

		void main() {

			vec3 N = normalize( vWorldDirection );

			// For very low roughness, just sample the environment directly
			if ( roughness < 0.001 ) {

				gl_FragColor = vec4( textureLod( envMap, N, 0.0 ).rgb, 1.0 );
				return;

			}

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			// Tangent space basis for VNDF sampling
			vec3 up = abs( N.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, N ) );
			vec3 bitangent = cross( N, tangent );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			for ( uint i = 0u; i < GGX_SAMPLES; i ++ ) {

				vec2 Xi = hammersley( i, GGX_SAMPLES );

				// With V = N, sample the reflected direction directly.
				float invQ = 1.0 / ( 1.0 - Xi.x + alpha2 * Xi.x );
				float NdotL = ( 1.0 - Xi.x - alpha2 * Xi.x ) * invQ;

				if ( NdotL > 0.0 ) {

					float phi = 2.0 * PI * Xi.y;
					float sinTheta = 2.0 * alpha * sqrt( Xi.x * ( 1.0 - Xi.x ) ) * invQ;
					vec3 L = N * NdotL + ( tangent * cos( phi ) + bitangent * sin( phi ) ) * sinTheta;

					// Match the source mip to the sample's solid angle. The terms
					// independent of the sample are precomputed in lodBias.
					float d = alpha2 * invQ;
					float lod = max( log2( d ) + lodBias, 0.0 );

					// Weight by NdotL for the split-sum approximation
					prefilteredColor += textureLod( envMap, L, lod ).rgb * NdotL;
					totalWeight += NdotL;

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Jo(){return Ko(`PMREMGGXIntegration`,{envMap:{value:null},roughness:{value:0},sourceLod:{value:0},sourceSize:{value:Bo}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float roughness;
		uniform float sourceLod;
		uniform int sourceSize;

		void main() {

			vec3 N = normalize( vWorldDirection );

			float alpha = roughness * roughness;
			float alpha2 = alpha * alpha;

			float texelSize = 2.0 / float( sourceSize );

			vec3 prefilteredColor = vec3( 0.0 );
			float totalWeight = 0.0;

			// Pair opposite texels: only the one in N's hemisphere contributes.
			for ( int face = 0; face < 3; face ++ ) {

				for ( int y = 0; y < sourceSize; y ++ ) {

					for ( int x = 0; x < sourceSize; x ++ ) {

						vec2 uv = ( vec2( x, y ) + 0.5 ) * texelSize - 1.0;
						vec3 texelDirection = face == 0 ? vec3( 1.0, uv ) : ( face == 1 ? vec3( uv.x, 1.0, uv.y ) : vec3( uv, 1.0 ) );

						float invDistance = inversesqrt( 1.0 + dot( uv, uv ) );
						float NdotL = dot( N, texelDirection );
						texelDirection *= NdotL < 0.0 ? - 1.0 : 1.0;
						NdotL = abs( NdotL ) * invDistance;

						// With V = N, NdotH squared is ( 1 + NdotL ) / 2. Common factors
						// in the GGX distribution and texel solid angle cancel when normalized.
						float d = 1.0 + alpha2 + ( alpha2 - 1.0 ) * NdotL;
						float weight = NdotL * invDistance * invDistance * invDistance / ( d * d );

						prefilteredColor += textureLod( envMap, texelDirection, sourceLod ).rgb * weight;
						totalWeight += weight;

					}

				}

			}

			gl_FragColor = vec4( prefilteredColor / totalWeight, 1.0 );

		}
	`)}function Yo(){return Ko(`PMREMSphericalGaussianBlur`,{envMap:{value:null},sigma:{value:0}},`

		#define SAMPLES ${Ro}
		#define GOLDEN_ANGLE 2.39996322973

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float sigma;

		#include <common>

		void main() {

			vec3 outputDirection = normalize( vWorldDirection );

			vec3 up = abs( outputDirection.z ) < 0.999 ? vec3( 0.0, 0.0, 1.0 ) : vec3( 1.0, 0.0, 0.0 );
			vec3 tangent = normalize( cross( up, outputDirection ) );
			vec3 bitangent = cross( outputDirection, tangent );

			// Truncate the kernel at three standard deviations or at the antipode.
			float thetaMax = min( 3.0 * sigma, PI );
			float truncation = 1.0 - exp( - 0.5 * thetaMax * thetaMax / ( sigma * sigma ) );

			vec3 accumColor = vec3( 0.0 );
			float accumWeight = 0.0;

			for ( int i = 0; i < SAMPLES; i ++ ) {

				// Stratified inverse-CDF sampling of the Gaussian, placed on a golden-angle spiral.
				float stratum = ( float( i ) + 0.5 ) / float( SAMPLES );
				float theta = sigma * sqrt( - 2.0 * log( 1.0 - stratum * truncation ) );
				float phi = float( i ) * GOLDEN_ANGLE;

				vec3 offset = cos( phi ) * tangent + sin( phi ) * bitangent;
				vec3 sampleDirection = cos( theta ) * outputDirection + sin( theta ) * offset;

				// Correct the planar sample density to solid angle.
				float weight = sin( theta ) / theta;

				accumColor += weight * textureLod( envMap, sampleDirection, 0.0 ).rgb;
				accumWeight += weight;

			}

			gl_FragColor = vec4( accumColor / accumWeight, 1.0 );

		}
	`)}function Xo(){return Ko(`PMREMEquirectangularToCubemap`,{envMap:{value:null}},`

		varying vec3 vWorldDirection;

		uniform sampler2D envMap;

		#include <common>

		void main() {

			// Average four subpixel samples to preserve small, bright features.
			vec3 direction = normalize( vWorldDirection );
			vec3 dx = dFdx( direction ) * 0.25;
			vec3 dy = dFdy( direction ) * 0.25;

			vec3 color = textureLod( envMap, equirectUv( normalize( direction - dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx - dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction - dx + dy ) ), 0.0 ).rgb;
			color += textureLod( envMap, equirectUv( normalize( direction + dx + dy ) ), 0.0 ).rgb;
			gl_FragColor = vec4( color * 0.25, 1.0 );

		}
	`)}function Zo(){return Ko(`PMREMCubemapToCubemap`,{envMap:{value:null},flipEnvMap:{value:-1}},`

		varying vec3 vWorldDirection;

		uniform samplerCube envMap;
		uniform float flipEnvMap;

		void main() {

			gl_FragColor = vec4( textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) ).rgb, 1.0 );

		}
	`)}function Qo(e){let t=new WeakMap,n=new WeakMap,r=null;function i(e,t=!1){return e==null?null:t?o(e):a(e)}function a(n){if(n&&n.isTexture){let r=n.mapping;if(r===303||r===304){if(t.has(n)){let e=t.get(n).texture;return s(e,n.mapping)}{let r=n.image;if(r&&r.height>0){let i=new Fo(r.height);return i.fromEquirectangularTexture(e,n),t.set(n,i),n.addEventListener(`dispose`,l),s(i.texture,n.mapping)}return null}}}return n}function o(t){if(t&&t.isTexture&&t.isPMREMTexture!==!0){let i=t.mapping,a=i===303||i===304,o=i===301||i===302;if(a||o){let i=n.get(t),s=i===void 0?0:i.texture.pmremVersion;if(t.isRenderTargetTexture&&t.pmremVersion!==s)return r===null&&(r=new Wo(e)),i=a?r.fromEquirectangular(t,i):r.fromCubemap(t,i),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),i.texture;if(i!==void 0)return i.texture;{let s=t.image;return a&&s&&s.height>0||o&&s&&c(s)?(r===null&&(r=new Wo(e)),i=a?r.fromEquirectangular(t):r.fromCubemap(t),i.texture.pmremVersion=t.pmremVersion,n.set(t,i),t.addEventListener(`dispose`,u),i.texture):null}}}return t}function s(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function c(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function l(e){let n=e.target;n.removeEventListener(`dispose`,l);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function u(e){let t=e.target;t.removeEventListener(`dispose`,u);let r=n.get(t);r!==void 0&&(n.delete(t),r.dispose())}function d(){t=new WeakMap,n=new WeakMap,r!==null&&(r.dispose(),r=null)}return{get:i,dispose:d}}function $o(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r=e.getExtension(n);return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&on(`WebGLRenderer: `+e+` extension not supported.`),t}}}function es(e,t,n,r){let i={},a=new WeakMap,o=new FinalizationRegistry(e=>delete i[e]);function s(e){c(e.target)}function c(e){e.index!==null&&t.remove(e.index);for(let n in e.attributes)t.remove(e.attributes[n]);e.removeEventListener(`dispose`,s),delete i[e.id],o.unregister(e);let c=a.get(e);c&&(t.remove(c),a.delete(e)),r.releaseStatesOfGeometry(e),e.isInstancedBufferGeometry===!0&&delete e._maxInstanceCount,n.memory.geometries--}function l(e,t){return i[t.id]===void 0&&(t.addEventListener(`dispose`,s),i[t.id]=new WeakRef(t),o.register(t,t.id,t),n.memory.geometries++),t}function u(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER)}function d(e){let n=e.index,r=e.attributes.position,i=0;if(r===void 0)return;let o=n===null?r.array.length/3-1:n.array.length,s=new(r.count>=65535?oi:ai)(Math.ceil(o/3)*6,1),c=s.array;if(n!==null){let e=n.array;i=n.version;for(let t=0,n=0;t<o;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];c[n++]=r,c[n++]=i,c[n++]=i,c[n++]=a,c[n++]=a,c[n++]=r}}else{i=r.version;for(let e=0,t=0;e<o;e+=3){let n=e+0,r=e+1,i=e+2;c[t++]=n,c[t++]=r,c[t++]=r,c[t++]=i,c[t++]=i,c[t++]=n}}s.version=i;let l=a.get(e);l&&t.remove(l),a.set(e,s)}function f(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&d(e)}else d(e);return a.get(e)}function p(){for(let e in i){let t=i[e].deref();t!==void 0&&c(t)}}return{get:l,update:u,getWireframeAttribute:f,dispose:p}}function ts(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,o){if(o===0)return;t.get(`WEBGL_multi_draw`).multiDrawElementsWEBGL(r,i,0,a,e,0,o);let s=0;for(let e=0;e<o;e++)s+=i[e];n.update(s,r,1)}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function ns(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:W(`WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function rs(e,t,n){let r=new WeakMap,i=new Rn;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new Vn(h,p,m,u);g.type=Re,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new bn(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function is(e,t,n,r,i){let a=new WeakMap;function o(r){let o=i.render.frame,s=r.geometry,l=t.get(r,s);if(a.get(l)!==o&&(t.update(l),a.set(l,o)),r.isInstancedMesh&&(r.hasEventListener(`dispose`,c)===!1&&r.addEventListener(`dispose`,c),a.get(r)!==o&&(n.update(r.instanceMatrix,e.ARRAY_BUFFER),r.instanceColor!==null&&n.update(r.instanceColor,e.ARRAY_BUFFER),a.set(r,o))),r.isSkinnedMesh){let e=r.skeleton;a.get(e)!==o&&(e.update(),a.set(e,o))}return l}function s(){a=new WeakMap}function c(e){let t=e.target;t.removeEventListener(`dispose`,c),r.releaseStatesOfObject(t),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:o,dispose:s}}var as={1:`LINEAR_TONE_MAPPING`,2:`REINHARD_TONE_MAPPING`,3:`CINEON_TONE_MAPPING`,4:`ACES_FILMIC_TONE_MAPPING`,6:`AGX_TONE_MAPPING`,7:`NEUTRAL_TONE_MAPPING`,5:`CUSTOM_TONE_MAPPING`};function os(e,t,n,r,i,a){let o=new Bn(t,n,{type:e,depthBuffer:i,stencilBuffer:a,samples:r?4:0,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,resolveDepthBuffer:!1,resolveStencilBuffer:!1}),s=null,c=null,l=null,u=new yi;u.setAttribute(`position`,new si([-1,3,0,-1,-1,0,3,-1,0],3)),u.setAttribute(`uv`,new si([0,2,0,0,2,0],2));let d=new Da({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),f=new Ui(u,d),p=new io(-1,1,1,-1,0,1),m=null,h=null,g=!1,_,v=null,y=[],b=!1;this.setSize=function(e,t){o.setSize(e,t),s!==null&&s.setSize(e,t),c!==null&&c.setSize(e,t);for(let n=0;n<y.length;n++){let r=y[n];r.setSize&&r.setSize(e,t)}},this.setEffects=function(e){y=e,b=y.length>0&&y[0].isRenderPass===!0;let t=o.width,n=o.height;y.length>0&&s===null&&(s=new Bn(t,n,{type:ze,depthBuffer:!1,stencilBuffer:!1}),c=new Bn(t,n,{type:ze,depthBuffer:!1,stencilBuffer:!1}));let r=i===!0&&y.some(e=>e.needsDepthTexture===!0);r!==(o.depthTexture!==null)&&(r===!0&&l===null&&(l=new pa(t,n),a===!0&&(l.format=Ye,l.type=He)),o.dispose(),o.depthTexture=r?l:null,o.resolveDepthBuffer=r,o.storeMultisampledDepthBuffer=r);for(let e=0;e<y.length;e++){let i=y[e];i.setSize&&i.setSize(t,n),r&&i.needsDepthTexture===!0&&i.setDepthTexture&&i.setDepthTexture(l)}},this.begin=function(e,t){if(g||e.toneMapping===0&&y.length===0)return!1;if(v=t,t!==null){let e=t.width,n=t.height;(o.width!==e||o.height!==n)&&this.setSize(e,n)}return b===!1&&e.setRenderTarget(o),_=e.toneMapping,e.toneMapping=0,!0},this.hasRenderPass=function(){return b},this.end=function(e,t){e.toneMapping=_,g=!0;let n=o,r=s;for(let i=0;i<y.length;i++){let a=y[i];a.enabled!==!1&&(a.render(e,r,n,t),a.needsSwap!==!1&&(n=r,r=r===s?c:s))}if(m!==e.outputColorSpace||h!==e.toneMapping){m=e.outputColorSpace,h=e.toneMapping,d.defines={},J.getTransfer(m)===`srgb`&&(d.defines.SRGB_TRANSFER=``);let t=as[h];t&&(d.defines[t]=``),d.needsUpdate=!0}d.uniforms.tDiffuse.value=n.texture,e.setRenderTarget(v),e.render(f,p),v=null,g=!1},this.isCompositing=function(){return g},this.dispose=function(){o.dispose(),s!==null&&s.dispose(),c!==null&&c.dispose(),u.dispose(),d.dispose()}}var ss=new Ln,cs=new pa(1,1),ls=new ma(1),us=new Vn,ds=new Hn,fs=new fa,ps=[],ms=[],hs=new Float32Array(16),gs=new Float32Array(9),_s=new Float32Array(4);function vs(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=ps[i];if(a===void 0&&(a=new Float32Array(i),ps[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function ys(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function bs(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function xs(e,t){let n=ms[t];n===void 0&&(n=new Int32Array(t),ms[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function Ss(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function Cs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(ys(n,t))return;e.uniform2fv(this.addr,t),bs(n,t)}}function ws(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(ys(n,t))return;e.uniform3fv(this.addr,t),bs(n,t)}}function Ts(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(ys(n,t))return;e.uniform4fv(this.addr,t),bs(n,t)}}function Es(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(ys(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),bs(n,t)}else{if(ys(n,r))return;_s.set(r),e.uniformMatrix2fv(this.addr,!1,_s),bs(n,r)}}function Ds(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(ys(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),bs(n,t)}else{if(ys(n,r))return;gs.set(r),e.uniformMatrix3fv(this.addr,!1,gs),bs(n,r)}}function Os(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(ys(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),bs(n,t)}else{if(ys(n,r))return;hs.set(r),e.uniformMatrix4fv(this.addr,!1,hs),bs(n,r)}}function ks(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function As(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(ys(n,t))return;e.uniform2iv(this.addr,t),bs(n,t)}}function js(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(ys(n,t))return;e.uniform3iv(this.addr,t),bs(n,t)}}function Ms(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(ys(n,t))return;e.uniform4iv(this.addr,t),bs(n,t)}}function Ns(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function Ps(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(ys(n,t))return;e.uniform2uiv(this.addr,t),bs(n,t)}}function Fs(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(ys(n,t))return;e.uniform3uiv(this.addr,t),bs(n,t)}}function Is(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(ys(n,t))return;e.uniform4uiv(this.addr,t),bs(n,t)}}function Ls(e){return e.version===0&&(e.compareFunction=519,e.needsUpdate=!0),e}function Rs(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_2D_SHADOW?Ls(cs):ss,n.setTexture2D(t||a,i)}function zs(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||ds,i)}function Bs(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a;a=this.type===e.SAMPLER_CUBE_SHADOW?Ls(ls):fs,n.setTextureCube(t||a,i)}function Vs(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||us,i)}function Hs(e){switch(e){case 5126:return Ss;case 35664:return Cs;case 35665:return ws;case 35666:return Ts;case 35674:return Es;case 35675:return Ds;case 35676:return Os;case 5124:case 35670:return ks;case 35667:case 35671:return As;case 35668:case 35672:return js;case 35669:case 35673:return Ms;case 5125:return Ns;case 36294:return Ps;case 36295:return Fs;case 36296:return Is;case 35678:case 36198:case 36298:case 36306:case 35682:return Rs;case 35679:case 36299:case 36307:return zs;case 35680:case 36300:case 36308:case 36293:return Bs;case 36289:case 36303:case 36311:case 36292:return Vs}}function Us(e,t){e.uniform1fv(this.addr,t)}function Ws(e,t){let n=vs(t,this.size,2);e.uniform2fv(this.addr,n)}function Gs(e,t){let n=vs(t,this.size,3);e.uniform3fv(this.addr,n)}function Ks(e,t){let n=vs(t,this.size,4);e.uniform4fv(this.addr,n)}function qs(e,t){let n=vs(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Js(e,t){let n=vs(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Ys(e,t){let n=vs(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Xs(e,t){e.uniform1iv(this.addr,t)}function Zs(e,t){e.uniform2iv(this.addr,t)}function Qs(e,t){e.uniform3iv(this.addr,t)}function $s(e,t){e.uniform4iv(this.addr,t)}function ec(e,t){e.uniform1uiv(this.addr,t)}function tc(e,t){e.uniform2uiv(this.addr,t)}function nc(e,t){e.uniform3uiv(this.addr,t)}function rc(e,t){e.uniform4uiv(this.addr,t)}function ic(e,t,n){let r=this.cache,i=t.length,a=xs(n,i);ys(r,a)||(e.uniform1iv(this.addr,a),bs(r,a));let o;o=this.type===e.SAMPLER_2D_SHADOW?Ls(cs):ss;for(let e=0;e!==i;++e)n.setTexture2D(t[e]||o,a[e])}function ac(e,t,n){let r=this.cache,i=t.length,a=xs(n,i);ys(r,a)||(e.uniform1iv(this.addr,a),bs(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||ds,a[e])}function oc(e,t,n){let r=this.cache,i=t.length,a=xs(n,i);ys(r,a)||(e.uniform1iv(this.addr,a),bs(r,a));let o;o=this.type===e.SAMPLER_CUBE_SHADOW?Ls(ls):fs;for(let e=0;e!==i;++e)n.setTextureCube(t[e]||o,a[e])}function sc(e,t,n){let r=this.cache,i=t.length,a=xs(n,i);ys(r,a)||(e.uniform1iv(this.addr,a),bs(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||us,a[e])}function cc(e){switch(e){case 5126:return Us;case 35664:return Ws;case 35665:return Gs;case 35666:return Ks;case 35674:return qs;case 35675:return Js;case 35676:return Ys;case 5124:case 35670:return Xs;case 35667:case 35671:return Zs;case 35668:case 35672:return Qs;case 35669:case 35673:return $s;case 5125:return ec;case 36294:return tc;case 36295:return nc;case 36296:return rc;case 35678:case 36198:case 36298:case 36306:case 35682:return ic;case 35679:case 36299:case 36307:return ac;case 35680:case 36300:case 36308:case 36293:return oc;case 36289:case 36303:case 36311:case 36292:return sc}}var lc=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Hs(t.type)}},uc=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=cc(t.type)}},dc=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},fc=/(\w+)(\])?(\[|\.)?/g;function pc(e,t){e.seq.push(t),e.map[t.id]=t}function mc(e,t,n){let r=e.name,i=r.length;for(fc.lastIndex=0;;){let a=fc.exec(r),o=fc.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){pc(n,l===void 0?new lc(s,e,t):new uc(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new dc(s),pc(n,e)),n=e}}}var hc=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);mc(n,e.getUniformLocation(t,n.name),this)}let r=[],i=[];for(let t of this.seq)t.type===e.SAMPLER_2D_SHADOW||t.type===e.SAMPLER_CUBE_SHADOW||t.type===e.SAMPLER_2D_ARRAY_SHADOW?r.push(t):i.push(t);r.length>0&&(this.seq=r.concat(i))}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function gc(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var _c=37297,vc=0;function yc(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}var bc=new q;function xc(e){J._getMatrix(bc,J.workingColorSpace,e);let t=`mat3( ${bc.elements.map(e=>e.toFixed(4))} )`;switch(J.getTransfer(e)){case qt:return[t,`LinearTransferOETF`];case Jt:return[t,`sRGBTransferOETF`];default:return U(`WebGLProgram: Unsupported color space: `,e),[t,`LinearTransferOETF`]}}function Sc(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=(e.getShaderInfoLog(t)||``).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+yc(e.getShaderSource(t),r)}return i}function Cc(e,t){let n=xc(t);return[`vec4 ${e}( vec4 value ) {`,`	return ${n[1]}( vec4( ${n[0]} * value.rgb, value.a ) );`,`}`].join(`
`)}var wc={1:`Linear`,2:`Reinhard`,3:`Cineon`,4:`ACESFilmic`,6:`AgX`,7:`Neutral`,5:`Custom`};function Tc(e,t){let n=wc[t];return n===void 0?(U(`WebGLProgram: Unsupported toneMapping:`,t),`vec3 `+e+`( vec3 color ) { return LinearToneMapping( color ); }`):`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}var Ec=new K;function Dc(){return J.getLuminanceCoefficients(Ec),[`float luminance( const in vec3 rgb ) {`,`	const vec3 weights = vec3( ${Ec.x.toFixed(4)}, ${Ec.y.toFixed(4)}, ${Ec.z.toFixed(4)} );`,`	return dot( weights, rgb );`,`}`].join(`
`)}function Oc(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(jc).join(`
`)}function kc(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function Ac(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function jc(e){return e!==``}function Mc(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_SUN_LIGHTS/g,t.numSunLights).replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_SUN_LIGHT_SHADOWS/g,t.numSunLightShadows).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows).replace(/NUM_LIGHT_PROBE_GRIDS/g,t.numLightProbeGrids)}function Nc(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var Pc=/^[ \t]*#include +<([\w\d./]+)>/gm;function Fc(e){return e.replace(Pc,Ic)}function Ic(e,t){let n=X[t];if(n===void 0)throw Error(`THREE.WebGLProgram: Can not resolve #include <`+t+`>`);return Fc(n)}var Lc=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Rc(e){return e.replace(Lc,zc)}function zc(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function Bc(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}var Vc={1:`SHADOWMAP_TYPE_PCF`,3:`SHADOWMAP_TYPE_VSM`};function Hc(e){return Vc[e.shadowMapType]||`SHADOWMAP_TYPE_BASIC`}var Uc={302:`ENVMAP_MODE_REFRACTION`};function Wc(e){return e.envMap===!1?`ENVMAP_MODE_REFLECTION`:Uc[e.envMapMode]||`ENVMAP_MODE_REFLECTION`}var Gc={0:`ENVMAP_BLENDING_MULTIPLY`,1:`ENVMAP_BLENDING_MIX`,2:`ENVMAP_BLENDING_ADD`};function Kc(e){return e.envMap===!1?`ENVMAP_BLENDING_NONE`:Gc[e.combine]||`ENVMAP_BLENDING_NONE`}function qc(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=Hc(n),l=n.envMapPMREM===!0?`ENVMAP_TYPE_PMREM`:`ENVMAP_TYPE_CUBE`,u=Wc(n),d=Kc(n),f=Oc(n),p=kc(a),m=i.createProgram(),h,g,_=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(h=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(jc).join(`
`),h.length>0&&(h+=`
`),g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p].filter(jc).join(`
`),g.length>0&&(g+=`
`)):(h=[Bc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.batchingColor?`#define USE_BATCHING_COLOR`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.diffuseRoughnessMapUv?`#define DIFFUSE_ROUGHNESSMAP_UV `+n.diffuseRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexNormals?`#define HAS_NORMAL`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(jc).join(`
`),g=[Bc(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,p,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,n.envMapPMREM?`#define ENVMAP_MAX_LOD `+n.envMapMaxLod+`.0`:``,n.envMapPMREM?`#define ENVMAP_SIZE `+n.envMapSize+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.packedNormalMap?`#define USE_PACKED_NORMALMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.diffuseRoughness?`#define USE_DIFFUSE_ROUGHNESS`:``,n.diffuseRoughnessMap?`#define USE_DIFFUSE_ROUGHNESSMAP`:``,n.dispersion?`#define USE_DISPERSION`:``,n.retroreflection?`#define USE_RETROREFLECTION`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas||n.batchingColor?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.decodeVideoTextureEmissive?`#define DECODE_VIDEO_TEXTURE_EMISSIVE`:``,n.logarithmicDepthBuffer?`#define USE_LOGARITHMIC_DEPTH_BUFFER`:``,n.reversedDepthBuffer?`#define USE_REVERSED_DEPTH_BUFFER`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:X.tonemapping_pars_fragment,n.toneMapping===0?``:Tc(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,X.colorspace_pars_fragment,Cc(`linearToOutputTexel`,n.outputColorSpace),Dc(),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(jc).join(`
`)),o=Fc(o),o=Mc(o,n),o=Nc(o,n),s=Fc(s),s=Mc(s,n),s=Nc(s,n),o=Rc(o),s=Rc(s),n.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,h=[f,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+h,g=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+g);let v=_+h+o,y=_+g+s,b=gc(i,i.VERTEX_SHADER,v),x=gc(i,i.FRAGMENT_SHADER,y);i.attachShader(m,b),i.attachShader(m,x),n.index0AttributeName===void 0?n.hasPositionAttribute===!0&&i.bindAttribLocation(m,0,`position`):i.bindAttribLocation(m,0,n.index0AttributeName),i.linkProgram(m);function S(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(m)||``,r=i.getShaderInfoLog(b)||``,a=i.getShaderInfoLog(x)||``,o=n.trim(),s=r.trim(),c=a.trim(),l=!0,u=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1){if(l=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,m,b,x);else{let e=Sc(i,b,`vertex`),n=Sc(i,x,`fragment`);W(`WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+o+`
`+e+`
`+n)}}else o===``?(s===``||c===``)&&(u=!1):U(`WebGLProgram: Program Info Log:`,o);u&&(t.diagnostics={runnable:l,programLog:o,vertexShader:{log:s,prefix:h},fragmentShader:{log:c,prefix:g}})}i.deleteShader(b),i.deleteShader(x),C=new hc(i,m),w=Ac(i,m)}let C;this.getUniforms=function(){return C===void 0&&S(this),C};let w;this.getAttributes=function(){return w===void 0&&S(this),w};let T=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return T===!1&&(T=i.getProgramParameter(m,_c)),T},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=vc++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=b,this.fragmentShader=x,this}var Jc=0,Yc=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let r=this._getShaderCacheForMaterial(e);return r.has(t)===!1&&(r.add(t),t.usedTimes++),r.has(n)===!1&&(r.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Xc(e),t.set(e,n)),n}},Xc=class{constructor(e){this.id=Jc++,this.code=e,this.usedTimes=0}};function Zc(e){return e===1030||e===37490||e===36285}function Qc(e,t,n,r,i,a){let o=new er,s=new Yc,c=new Set,l=[],u=new Map,d=r.logarithmicDepthBuffer,f={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distance`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function p(e){return c.add(e),e===0?`uv`:`uv${e}`}function m(i,o,l,u,m,h){let g=u.fog,_=m.geometry,v=i.isMeshStandardMaterial||i.isMeshLambertMaterial||i.isMeshPhongMaterial?u.environment:null,y=i.isMeshStandardMaterial||i.isMeshLambertMaterial&&!i.envMap||i.isMeshPhongMaterial&&!i.envMap,b=t.get(i.envMap||v,y),x=f[i.type],S=r.precision;i.precision!==null&&(S=r.getMaxPrecision(i.precision),S!==i.precision&&U(`WebGLProgram.getParameters:`,i.precision,`not supported, using`,S,`instead.`));let C=_.morphAttributes.position||_.morphAttributes.normal||_.morphAttributes.color,w=C===void 0?0:C.length,T=0;_.morphAttributes.position!==void 0&&(T=1),_.morphAttributes.normal!==void 0&&(T=2),_.morphAttributes.color!==void 0&&(T=3);let E,D,O,k;if(x){let e=Eo[x];E=e.vertexShader,D=e.fragmentShader}else{E=i.vertexShader,D=i.fragmentShader;let e=s.getVertexShaderStage(i),t=s.getFragmentShaderStage(i);s.update(i,e,t),O=e.id,k=t.id}let A=e.getRenderTarget(),j=e.state.buffers.depth.getReversed(),M=m.isInstancedMesh===!0,N=m.isBatchedMesh===!0,P=!!i.map,ee=!!i.matcap,F=!!b,te=F&&b.isPMREMTexture===!0,ne=!!i.aoMap,re=!!i.lightMap,ie=!!i.bumpMap&&i.wireframe===!1,I=!!i.normalMap,ae=!!i.displacementMap,oe=!!i.emissiveMap,se=!!i.metalnessMap,L=!!i.roughnessMap,ce=i.anisotropy>0,R=i.clearcoat>0,le=i.diffuseRoughness>0,ue=i.dispersion>0,de=i.retroreflectivity>0,fe=i.iridescence>0,pe=i.sheen>0,me=i.transmission>0,he=ce&&!!i.anisotropyMap,ge=R&&!!i.clearcoatMap,_e=R&&!!i.clearcoatNormalMap,ve=R&&!!i.clearcoatRoughnessMap,ye=le&&!!i.diffuseRoughnessMap,z=fe&&!!i.iridescenceMap,be=fe&&!!i.iridescenceThicknessMap,xe=pe&&!!i.sheenColorMap,Se=pe&&!!i.sheenRoughnessMap,B=!!i.specularMap,Ce=!!i.specularColorMap,V=!!i.specularIntensityMap,H=me&&!!i.transmissionMap,we=me&&!!i.thicknessMap,Te=!!i.gradientMap,Ee=!!i.alphaMap,De=i.alphaTest>0,Oe=!!i.alphaHash,ke=!!i.extensions,Ae=0;i.toneMapped&&(A===null||A.isXRRenderTarget===!0)&&(Ae=e.toneMapping);let je=te?b.isCompressedCubeTexture?b.image[0].mipmaps:b.mipmaps:null,Me={shaderID:x,shaderType:i.type,shaderName:i.name,vertexShader:E,fragmentShader:D,defines:i.defines,customVertexShaderID:O,customFragmentShaderID:k,isRawShaderMaterial:i.isRawShaderMaterial===!0,glslVersion:i.glslVersion,precision:S,batching:N,batchingColor:N&&m._colorsTexture!==null,instancing:M,instancingColor:M&&m.instanceColor!==null,instancingMorph:M&&m.morphTexture!==null,outputColorSpace:A===null?e.outputColorSpace:A.isXRRenderTarget===!0?A.texture.colorSpace:J.workingColorSpace,alphaToCoverage:!!i.alphaToCoverage,map:P,matcap:ee,envMap:F,envMapMode:F&&b.mapping,envMapPMREM:te,envMapMaxLod:te?je.length-1:null,envMapSize:te?je[0].width:null,aoMap:ne,lightMap:re,bumpMap:ie,normalMap:I,displacementMap:ae,emissiveMap:oe,normalMapObjectSpace:I&&i.normalMapType===1,normalMapTangentSpace:I&&i.normalMapType===0,packedNormalMap:I&&i.normalMapType===0&&Zc(i.normalMap.format),metalnessMap:se,roughnessMap:L,anisotropy:ce,anisotropyMap:he,clearcoat:R,clearcoatMap:ge,clearcoatNormalMap:_e,clearcoatRoughnessMap:ve,diffuseRoughness:le,diffuseRoughnessMap:ye,dispersion:ue,retroreflection:de,iridescence:fe,iridescenceMap:z,iridescenceThicknessMap:be,sheen:pe,sheenColorMap:xe,sheenRoughnessMap:Se,specularMap:B,specularColorMap:Ce,specularIntensityMap:V,transmission:me,transmissionMap:H,thicknessMap:we,gradientMap:Te,opaque:i.transparent===!1&&i.blending===1&&i.alphaToCoverage===!1,alphaMap:Ee,alphaTest:De,alphaHash:Oe,combine:i.combine,mapUv:P&&p(i.map.channel),aoMapUv:ne&&p(i.aoMap.channel),lightMapUv:re&&p(i.lightMap.channel),bumpMapUv:ie&&p(i.bumpMap.channel),normalMapUv:I&&p(i.normalMap.channel),displacementMapUv:ae&&p(i.displacementMap.channel),emissiveMapUv:oe&&p(i.emissiveMap.channel),metalnessMapUv:se&&p(i.metalnessMap.channel),roughnessMapUv:L&&p(i.roughnessMap.channel),anisotropyMapUv:he&&p(i.anisotropyMap.channel),clearcoatMapUv:ge&&p(i.clearcoatMap.channel),clearcoatNormalMapUv:_e&&p(i.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ve&&p(i.clearcoatRoughnessMap.channel),diffuseRoughnessMapUv:ye&&p(i.diffuseRoughnessMap.channel),iridescenceMapUv:z&&p(i.iridescenceMap.channel),iridescenceThicknessMapUv:be&&p(i.iridescenceThicknessMap.channel),sheenColorMapUv:xe&&p(i.sheenColorMap.channel),sheenRoughnessMapUv:Se&&p(i.sheenRoughnessMap.channel),specularMapUv:B&&p(i.specularMap.channel),specularColorMapUv:Ce&&p(i.specularColorMap.channel),specularIntensityMapUv:V&&p(i.specularIntensityMap.channel),transmissionMapUv:H&&p(i.transmissionMap.channel),thicknessMapUv:we&&p(i.thicknessMap.channel),alphaMapUv:Ee&&p(i.alphaMap.channel),vertexTangents:!!_.attributes.tangent&&(I||ce),vertexNormals:!!_.attributes.normal,vertexColors:i.vertexColors,vertexAlphas:i.vertexColors===!0&&!!_.attributes.color&&_.attributes.color.itemSize===4,pointsUvs:m.isPoints===!0&&!!_.attributes.uv&&(P||Ee),fog:!!g,useFog:i.fog===!0,fogExp2:!!g&&g.isFogExp2,flatShading:i.wireframe===!1&&(i.flatShading===!0||_.attributes.normal===void 0&&I===!1&&(i.isMeshLambertMaterial||i.isMeshPhongMaterial||i.isMeshStandardMaterial||i.isMeshPhysicalMaterial)),sizeAttenuation:i.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:j,skinning:m.isSkinnedMesh===!0,hasPositionAttribute:_.attributes.position!==void 0,morphTargets:_.morphAttributes.position!==void 0,morphNormals:_.morphAttributes.normal!==void 0,morphColors:_.morphAttributes.color!==void 0,morphTargetsCount:w,morphTextureStride:T,numSunLights:o.sun.length,numDirLights:o.directional.length,numPointLights:o.point.length,numSpotLights:o.spot.length,numSpotLightMaps:o.spotLightMap.length,numRectAreaLights:o.rectArea.length,numHemiLights:o.hemi.length,numSunLightShadows:o.sunShadowMap.length,numDirLightShadows:o.directionalShadowMap.length,numPointLightShadows:o.pointShadowMap.length,numSpotLightShadows:o.spotShadowMap.length,numSpotLightShadowsWithMaps:o.numSpotLightShadowsWithMaps,numLightProbes:o.numLightProbes,numLightProbeGrids:h.filter(e=>e.texture!==null).length,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:i.dithering,shadowMapEnabled:e.shadowMap.enabled&&l.length>0,shadowMapType:e.shadowMap.type,toneMapping:Ae,decodeVideoTexture:P&&i.map.isVideoTexture===!0&&J.getTransfer(i.map.colorSpace)===`srgb`,decodeVideoTextureEmissive:oe&&i.emissiveMap.isVideoTexture===!0&&J.getTransfer(i.emissiveMap.colorSpace)===`srgb`,premultipliedAlpha:i.premultipliedAlpha,doubleSided:i.side===2,flipSided:i.side===1,useDepthPacking:i.depthPacking>=0,depthPacking:i.depthPacking||0,index0AttributeName:i.index0AttributeName,extensionClipCullDistance:ke&&i.extensions.clipCullDistance===!0&&n.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:(ke&&i.extensions.multiDraw===!0||N)&&n.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:n.has(`KHR_parallel_shader_compile`),customProgramCacheKey:i.customProgramCacheKey()};return Me.vertexUv1s=c.has(1),Me.vertexUv2s=c.has(2),Me.vertexUv3s=c.has(3),c.clear(),Me}function h(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(g(n,t),_(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function g(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapPMREM),e.push(t.envMapMaxLod),e.push(t.envMapSize),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.diffuseRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.numSunLights),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numSunLightShadows),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.numLightProbeGrids),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function _(e,t){o.disableAll(),t.instancing&&o.enable(0),t.instancingColor&&o.enable(1),t.instancingMorph&&o.enable(2),t.matcap&&o.enable(3),t.envMap&&o.enable(4),t.normalMapObjectSpace&&o.enable(5),t.normalMapTangentSpace&&o.enable(6),t.clearcoat&&o.enable(7),t.iridescence&&o.enable(8),t.alphaTest&&o.enable(9),t.vertexColors&&o.enable(10),t.vertexAlphas&&o.enable(11),t.vertexUv1s&&o.enable(12),t.vertexUv2s&&o.enable(13),t.vertexUv3s&&o.enable(14),t.vertexTangents&&o.enable(15),t.anisotropy&&o.enable(16),t.alphaHash&&o.enable(17),t.batching&&o.enable(18),t.dispersion&&o.enable(19),t.retroreflection&&o.enable(24),t.diffuseRoughness&&o.enable(25),t.batchingColor&&o.enable(20),t.gradientMap&&o.enable(21),t.packedNormalMap&&o.enable(22),t.vertexNormals&&o.enable(23),e.push(o.mask),o.disableAll(),t.fog&&o.enable(0),t.useFog&&o.enable(1),t.flatShading&&o.enable(2),t.logarithmicDepthBuffer&&o.enable(3),t.reversedDepthBuffer&&o.enable(4),t.skinning&&o.enable(5),t.morphTargets&&o.enable(6),t.morphNormals&&o.enable(7),t.morphColors&&o.enable(8),t.premultipliedAlpha&&o.enable(9),t.shadowMapEnabled&&o.enable(10),t.doubleSided&&o.enable(11),t.flipSided&&o.enable(12),t.useDepthPacking&&o.enable(13),t.dithering&&o.enable(14),t.transmission&&o.enable(15),t.sheen&&o.enable(16),t.opaque&&o.enable(17),t.pointsUvs&&o.enable(18),t.decodeVideoTexture&&o.enable(19),t.decodeVideoTextureEmissive&&o.enable(20),t.alphaToCoverage&&o.enable(21),t.numLightProbeGrids>0&&o.enable(22),t.hasPositionAttribute&&o.enable(23),e.push(o.mask)}function v(e){let t=f[e.type],n;if(t){let e=Eo[t];n=Ca.clone(e.uniforms)}else n=e.uniforms;return n}function y(t,n){let r=u.get(n);return r===void 0?(r=new qc(e,n,t,i),l.push(r),u.set(n,r)):++r.usedTimes,r}function b(e){if(--e.usedTimes===0){let t=l.indexOf(e);l[t]=l[l.length-1],l.pop(),u.delete(e.cacheKey),e.destroy()}}function x(e){s.remove(e)}function S(){s.dispose()}return{getParameters:m,getProgramCacheKey:h,getUniforms:v,acquireProgram:y,releaseProgram:b,releaseShaderCache:x,programs:l,dispose:S}}function $c(){let e=new WeakMap;function t(t){return e.has(t)}function n(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function r(t){e.delete(t)}function i(t,n,r){e.get(t)[n]=r}function a(){e=new WeakMap}return{has:t,get:n,remove:r,update:i,dispose:a}}function el(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.materialVariant===t.materialVariant?e.z===t.z?e.id-t.id:e.z-t.z:e.materialVariant-t.materialVariant:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function tl(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function nl(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(e){let t=0;return e.isInstancedMesh&&(t+=2),e.isSkinnedMesh&&(t+=1),t}function s(n,r,i,a,s,c){let l=e[t];return l===void 0?(l={id:n.id,object:n,geometry:r,material:i,materialVariant:o(n),groupOrder:a,renderOrder:n.renderOrder,z:s,group:c},e[t]=l):(l.id=n.id,l.object=n,l.geometry=r,l.material=i,l.materialVariant=o(n),l.groupOrder=a,l.renderOrder=n.renderOrder,l.z=s,l.group=c),t++,l}function c(e,t,a,o,c,l,u){u.reversedDepth===!0&&(c=-c);let d=s(e,t,a,o,c,l);a.transmission>0?r.push(d):a.transparent===!0?i.push(d):n.push(d)}function l(e,t,a,o,c,l){let u=s(e,t,a,o,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function u(e,t){n.length>1&&n.sort(e||el),r.length>1&&r.sort(t||tl),i.length>1&&i.sort(t||tl)}function d(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:c,unshift:l,finish:d,sort:u}}function rl(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new nl,e.set(t,[i])):n>=r.length?(i=new nl,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function il(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={direction:new K,color:new Y};break;case`SpotLight`:n={position:new K,direction:new K,color:new Y,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new K,color:new Y,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new K,skyColor:new Y,groundColor:new Y};break;case`RectAreaLight`:n={color:new Y,position:new K,halfWidth:new K,halfHeight:new K}}return e[t.id]=n,n}}}function al(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`SunLight`:case`DirectionalLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bn};break;case`SpotLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bn};break;case`PointLight`:n={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new bn,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var ol=0;function sl(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function cl(e){let t=new il,n=al(),r={version:0,hash:{sunLength:-1,directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numSunShadows:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],sun:[],sunShadow:[],sunShadowMap:[],sunShadowMatrix:[],sunShadowCascade:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new K);let i=new K,a=new Un,o=new Un;function s(i){let a=0,o=0,s=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let c=0,l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0,b=0,x=0;i.sort(sl);for(let e=0,S=i.length;e<S;e++){let S=i[e],C=S.color,w=S.intensity,T=S.distance,E=null;if(S.shadow&&S.shadow.map&&(E=S.shadow.map.texture.format===1030?S.shadow.map.texture:S.shadow.map.depthTexture||S.shadow.map.texture),S.isAmbientLight)a+=C.r*w,o+=C.g*w,s+=C.b*w;else if(S.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(S.sh.coefficients[e],w);x++}else if(S.isSunLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize.copy(e.mapSize).multiply(e.getFrameExtents()),r.sunShadow[l]=t,r.sunShadowMap[l]=E;let i=e.getViewportCount();for(let t=0;t<i;t++)r.sunShadowMatrix[u+t]=e.getMatrix(t),r.sunShadowCascade[u+t]=e._cascadeData[t];u+=i,l++}r.sun[c]=e,c++}else if(S.isDirectionalLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[d]=t,r.directionalShadowMap[d]=E,r.directionalShadowMatrix[d]=S.shadow.matrix,g++}r.directional[d]=e,d++}else if(S.isSpotLight){let e=t.get(S);e.position.setFromMatrixPosition(S.matrixWorld),e.color.copy(C).multiplyScalar(w),e.distance=T,e.coneCos=Math.cos(S.angle),e.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),e.decay=S.decay,r.spot[p]=e;let i=S.shadow;if(S.map&&(r.spotLightMap[y]=S.map,y++,i.updateMatrices(S),S.castShadow&&b++),r.spotLightMatrix[p]=i.matrix,S.castShadow){let e=n.get(S);e.shadowIntensity=i.intensity,e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[p]=e,r.spotShadowMap[p]=E,v++}p++}else if(S.isRectAreaLight){let e=t.get(S);e.color.copy(C).multiplyScalar(w),e.halfWidth.set(S.width*.5,0,0),e.halfHeight.set(0,S.height*.5,0),r.rectArea[m]=e,m++}else if(S.isPointLight){let e=t.get(S);if(e.color.copy(S.color).multiplyScalar(S.intensity),e.distance=S.distance,e.decay=S.decay,S.castShadow){let e=S.shadow,t=n.get(S);t.shadowIntensity=e.intensity,t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[f]=t,r.pointShadowMap[f]=E,r.pointShadowMatrix[f]=S.shadow.matrix,_++}r.point[f]=e,f++}else if(S.isHemisphereLight){let e=t.get(S);e.skyColor.copy(S.color).multiplyScalar(w),e.groundColor.copy(S.groundColor).multiplyScalar(w),r.hemi[h]=e,h++}}m>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=Z.LTC_FLOAT_1,r.rectAreaLTC2=Z.LTC_FLOAT_2):(r.rectAreaLTC1=Z.LTC_HALF_1,r.rectAreaLTC2=Z.LTC_HALF_2)),r.ambient[0]=a,r.ambient[1]=o,r.ambient[2]=s;let S=r.hash;(S.sunLength!==c||S.directionalLength!==d||S.pointLength!==f||S.spotLength!==p||S.rectAreaLength!==m||S.hemiLength!==h||S.numSunShadows!==l||S.numDirectionalShadows!==g||S.numPointShadows!==_||S.numSpotShadows!==v||S.numSpotMaps!==y||S.numLightProbes!==x)&&(r.sun.length=c,r.directional.length=d,r.spot.length=p,r.rectArea.length=m,r.point.length=f,r.hemi.length=h,r.sunShadow.length=l,r.sunShadowMap.length=l,r.sunShadowMatrix.length=u,r.sunShadowCascade.length=u,r.directionalShadow.length=g,r.directionalShadowMap.length=g,r.directionalShadowMatrix.length=g,r.pointShadow.length=_,r.pointShadowMap.length=_,r.pointShadowMatrix.length=_,r.spotShadow.length=v,r.spotShadowMap.length=v,r.spotLightMatrix.length=v+y-b,r.spotLightMap.length=y,r.numSpotLightShadowsWithMaps=b,r.numLightProbes=x,S.sunLength=c,S.directionalLength=d,S.pointLength=f,S.spotLength=p,S.rectAreaLength=m,S.hemiLength=h,S.numSunShadows=l,S.numDirectionalShadows=g,S.numPointShadows=_,S.numSpotShadows=v,S.numSpotMaps=y,S.numLightProbes=x,r.version=ol++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=0,f=t.matrixWorldInverse;for(let t=0,p=e.length;t<p;t++){let p=e[t];if(p.isSunLight){let e=r.sun[n];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),n++}else if(p.isDirectionalLight){let e=r.directional[s];e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),s++}else if(p.isSpotLight){let e=r.spot[l];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),e.direction.setFromMatrixPosition(p.matrixWorld),i.setFromMatrixPosition(p.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(f),l++}else if(p.isRectAreaLight){let e=r.rectArea[u];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),o.identity(),a.copy(p.matrixWorld),a.premultiply(f),o.extractRotation(a),e.halfWidth.set(p.width*.5,0,0),e.halfHeight.set(0,p.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),u++}else if(p.isPointLight){let e=r.point[c];e.position.setFromMatrixPosition(p.matrixWorld),e.position.applyMatrix4(f),c++}else if(p.isHemisphereLight){let e=r.hemi[d];e.direction.setFromMatrixPosition(p.matrixWorld),e.direction.transformDirection(f),d++}}}return{setup:s,setupView:c,state:r}}function ll(e){let t=new cl(e),n=[],r=[],i=[];function a(e){u.camera=e,n.length=0,r.length=0,i.length=0}function o(e){e.isLightProbeGrid?i.push(e):n.push(e)}function s(e){r.push(e)}function c(){t.setup(n),i.sort((e,t)=>e.priority-t.priority||e.id-t.id)}function l(e){t.setupView(n,e)}let u={lightsArray:n,shadowsArray:r,lightProbeGridArray:i,camera:null,lights:t,transmissionRenderTarget:{},textureUnits:0};return{init:a,state:u,setupLights:c,setupLightsView:l,pushLight:o,pushShadow:s}}function ul(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new ll(e),t.set(n,[a])):r>=i.length?(a=new ll(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var dl=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,fl=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,pl=[new K(1,0,0),new K(-1,0,0),new K(0,1,0),new K(0,-1,0),new K(0,0,1),new K(0,0,-1)],ml=[new K(0,-1,0),new K(0,-1,0),new K(0,0,1),new K(0,0,-1),new K(0,-1,0),new K(0,-1,0)],hl=new Un,gl=new K,_l=new K;function vl(e,t,n){let r=new Xi,i=new bn,a=new bn,o=new Rn,s=new Oa,c=new ka,l={},u=n.maxTextureSize,d={0:1,1:0,2:2},f=new Ea({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new bn},radius:{value:4}},vertexShader:dl,fragmentShader:fl}),p=f.clone();p.defines.HORIZONTAL_PASS=1;let m=new yi;m.setAttribute(`position`,new ii(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let h=new Ui(m,f),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let _=this.type;this.render=function(t,n,s){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||t.length===0)return;this.type===2&&(U(`WebGLShadowMap: PCFSoftShadowMap has been removed. Using PCFShadowMap instead.`),this.type=1);let c=e.getRenderTarget(),l=e.getActiveCubeFace(),d=e.getActiveMipmapLevel(),f=e.state;f.setBlending(0),f.buffers.depth.getReversed()===!0?f.buffers.color.setClear(0,0,0,0):f.buffers.color.setClear(1,1,1,1),f.buffers.depth.setTest(!0),f.setScissorTest(!1);let p=_!==this.type;p&&n.traverse(function(e){e.material&&(Array.isArray(e.material)?e.material.forEach(e=>e.needsUpdate=!0):e.material.needsUpdate=!0)});for(let c=0,l=t.length;c<l;c++){let l=t[c],d=l.shadow;if(d===void 0){U(`WebGLShadowMap:`,l,`has no shadow.`);continue}if(d.autoUpdate===!1&&d.needsUpdate===!1)continue;i.copy(d.mapSize);let m=d.getFrameExtents();i.multiply(m),a.copy(d.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(a.x=Math.floor(u/m.x),i.x=a.x*m.x,d.mapSize.x=a.x),i.y>u&&(a.y=Math.floor(u/m.y),i.y=a.y*m.y,d.mapSize.y=a.y));let h=e.state.buffers.depth.getReversed();if(d.camera._reversedDepth=h,d.map===null||p===!0){if(d.map!==null&&(d.map.depthTexture!==null&&(d.map.depthTexture.dispose(),d.map.depthTexture=null),d.map.dispose()),this.type===3){if(l.isPointLight){U(`WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.`);continue}d.map=new Bn(i.x,i.y,{format:Qe,type:ze,minFilter:ke,magFilter:ke,generateMipmaps:!1}),d.map.texture.name=l.name+`.shadowMap`,d.map.depthTexture=new pa(i.x,i.y,Re),d.map.depthTexture.name=l.name+`.shadowMapDepth`,d.map.depthTexture.format=Je,d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Ee,d.map.depthTexture.magFilter=Ee}else l.isPointLight?(d.map=new Fo(i.x),d.map.depthTexture=new ma(i.x,Le)):(d.map=new Bn(i.x,i.y),d.map.depthTexture=new pa(i.x,i.y,Le)),d.map.depthTexture.name=l.name+`.shadowMap`,d.map.depthTexture.format=Je,this.type===1?(d.map.depthTexture.compareFunction=h?518:515,d.map.depthTexture.minFilter=ke,d.map.depthTexture.magFilter=ke):(d.map.depthTexture.compareFunction=null,d.map.depthTexture.minFilter=Ee,d.map.depthTexture.magFilter=Ee);d.camera.updateProjectionMatrix()}d.map.isWebGLCubeRenderTarget!==!0&&(d.map.width!==i.x||d.map.height!==i.y)&&d.map.setSize(i.x,i.y);let g=d.map.isWebGLCubeRenderTarget?6:d.getViewportCount();l.isPointLight!==!0&&d.updateMatrices(l,s);let _=d.camera.layers.mask&4294967294?d.camera.layers:s.layers;for(let t=0;t<g;t++){let i=d.getCamera(t);if(l.isPointLight){let e=d.camera,n=d.matrix,r=l.distance||e.far;r!==e.far&&(e.far=r,e.updateProjectionMatrix()),gl.setFromMatrixPosition(l.matrixWorld),e.position.copy(gl),_l.copy(e.position),_l.add(pl[t]),e.up.copy(ml[t]),e.lookAt(_l),e.updateMatrixWorld(),n.makeTranslation(-gl.x,-gl.y,-gl.z),hl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),d._frustum.setFromProjectionMatrix(hl,e.coordinateSystem,e.reversedDepth)}if(d.map.isWebGLCubeRenderTarget)e.setRenderTarget(d.map,t),e.clear();else{t===0&&(e.setRenderTarget(d.map),e.clear());let n=d.getViewport(t);o.set(a.x*n.x,a.y*n.y,a.x*n.z,a.y*n.w),f.viewport(o)}r=d.getFrustum(t),b(n,s,i,l,_,this.type)}d.isPointLightShadow!==!0&&this.type===3&&v(d,s),d.needsUpdate=!1}_=this.type,g.needsUpdate=!1,e.setRenderTarget(c,l,d)};function v(n,r){let a=t.update(h);f.defines.VSM_SAMPLES!==n.blurSamples&&(f.defines.VSM_SAMPLES=n.blurSamples,p.defines.VSM_SAMPLES=n.blurSamples,f.needsUpdate=!0,p.needsUpdate=!0),n.mapPass===null?n.mapPass=new Bn(i.x,i.y,{format:Qe,type:ze}):(n.mapPass.width!==n.map.width||n.mapPass.height!==n.map.height)&&n.mapPass.setSize(n.map.width,n.map.height),f.uniforms.shadow_pass.value=n.map.depthTexture,f.uniforms.resolution.value.set(n.map.width,n.map.height),f.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,f,h,null),p.uniforms.shadow_pass.value=n.mapPass.texture,p.uniforms.resolution.value.set(n.map.width,n.map.height),p.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,p,h,null)}function y(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?c:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0||n.alphaToCoverage===!0){let e=a.uuid,t=n.uuid,r=l[e];r===void 0&&(r={},l[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,x)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?d[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaToCoverage===!0?.5:n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function b(n,i,a,o,s,c){if(n.visible===!1)return;if(n.layers.test(s)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&c===3)&&(!n.frustumCulled||n.intersectsFrustum(r))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),s=n.material;if(Array.isArray(s)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=s[u.materialIndex];if(d&&d.visible){let t=y(n,d,o,c);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(s.visible){let t=y(n,s,o,c);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let l=n.children;for(let e=0,t=l.length;e<t;e++)b(l[e],i,a,o,s,c)}function x(e){e.target.removeEventListener(`dispose`,x);for(let t in l){let n=l[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function yl(e,t){function n(){let t=!1,n=new Rn,r=null,i=new Rn(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function r(){let n=!1,r=!1,i=null,a=null,o=null;return{setReversed:function(e){if(r!==e){let n=t.get(`EXT_clip_control`);e?n.clipControlEXT(n.LOWER_LEFT_EXT,n.ZERO_TO_ONE_EXT):n.clipControlEXT(n.LOWER_LEFT_EXT,n.NEGATIVE_ONE_TO_ONE_EXT),r=e;let i=o;o=null,this.setClear(i)}},getReversed:function(){return r},setTest:function(t){t?se(e.DEPTH_TEST):L(e.DEPTH_TEST)},setMask:function(t){i!==t&&!n&&(e.depthMask(t),i=t)},setFunc:function(t){if(r&&(t=cn[t]),a!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}a=t}},setLocked:function(e){n=e},setClear:function(t){o!==t&&(o=t,r&&(t=1-t),e.clearDepth(t))},reset:function(){n=!1,i=null,a=null,o=null,r=!1}}}function i(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?se(e.STENCIL_TEST):L(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let a=new n,o=new r,s=new i,c={},l=new WeakMap,u={},d={},f={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new Y(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,M=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),N=!1,P=0,ee=e.getParameter(e.VERSION);ee.indexOf(`WebGL`)===-1?ee.indexOf(`OpenGL ES`)!==-1&&(P=parseFloat(/^OpenGL ES (\d)/.exec(ee)[1]),N=P>=2):(P=parseFloat(/^WebGL (\d)/.exec(ee)[1]),N=P>=1);let F=null,te={},ne=e.getParameter(e.SCISSOR_BOX),re=e.getParameter(e.VIEWPORT),ie=new Rn().fromArray(ne),I=new Rn().fromArray(re);function ae(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let oe={};oe[e.TEXTURE_2D]=ae(e.TEXTURE_2D,e.TEXTURE_2D,1),oe[e.TEXTURE_CUBE_MAP]=ae(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),oe[e.TEXTURE_2D_ARRAY]=ae(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),oe[e.TEXTURE_3D]=ae(e.TEXTURE_3D,e.TEXTURE_3D,1,1),a.setClear(0,0,0,1),o.setClear(1),s.setClear(0),se(e.DEPTH_TEST),o.setFunc(3),me(!1),he(1),se(e.CULL_FACE),fe(0);function se(t){u[t]!==!0&&(e.enable(t),u[t]=!0)}function L(t){u[t]!==!1&&(e.disable(t),u[t]=!1)}function ce(t,n){return f[t]!==n&&(e.bindFramebuffer(t,n),f[t]=n,t===e.DRAW_FRAMEBUFFER&&(f[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(f[e.DRAW_FRAMEBUFFER]=n),!0)}function R(t,n){let r=m,i=!1;if(t){r=p.get(n),r===void 0&&(r=[],p.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function le(t){return h!==t&&(e.useProgram(t),h=t,!0)}let ue={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ue[103]=e.MIN,ue[104]=e.MAX;let de={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function fe(t,n,r,i,a,o,s,c,l,u){if(t===0)g===!0&&(L(e.BLEND),g=!1);else if(g===!1&&(se(e.BLEND),g=!0),t!==5){if(t!==_||u!==E){if((v!==100||x!==100)&&(e.blendEquation(e.FUNC_ADD),v=100,x=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:W(`WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case 3:W(`WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true`);break;case 4:W(`WebGLState: MultiplyBlending requires material.premultipliedAlpha = true`);break;default:W(`WebGLState: Invalid blending: `,t)}y=null,b=null,S=null,C=null,w.set(0,0,0),T=0,_=t,E=u}}else a||=n,o||=r,s||=i,(n!==v||a!==x)&&(e.blendEquationSeparate(ue[n],ue[a]),v=n,x=a),(r!==y||i!==b||o!==S||s!==C)&&(e.blendFuncSeparate(de[r],de[i],de[o],de[s]),y=r,b=i,S=o,C=s),(c.equals(w)===!1||l!==T)&&(e.blendColor(c.r,c.g,c.b,l),w.copy(c),T=l),_=t,E=!1}function pe(t,n){t.side===2?L(e.CULL_FACE):se(e.CULL_FACE);let r=t.side===1;n&&(r=!r),me(r),t.blending===1&&t.transparent===!1?fe(0):fe(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),o.setFunc(t.depthFunc),o.setTest(t.depthTest),o.setMask(t.depthWrite),a.setMask(t.colorWrite);let i=t.stencilWrite;s.setTest(i),i&&(s.setMask(t.stencilWriteMask),s.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),s.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),_e(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?se(e.SAMPLE_ALPHA_TO_COVERAGE):L(e.SAMPLE_ALPHA_TO_COVERAGE)}function me(t){D!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),D=t)}function he(t){t===0?L(e.CULL_FACE):(se(e.CULL_FACE),t!==O&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),O=t}function ge(t){t!==k&&(N&&e.lineWidth(t),k=t)}function _e(t,n,r){t?(se(e.POLYGON_OFFSET_FILL),(A!==n||j!==r)&&(A=n,j=r,o.getReversed()&&(n=-n,r=-r),e.polygonOffset(n,r))):L(e.POLYGON_OFFSET_FILL)}function ve(t){t?se(e.SCISSOR_TEST):L(e.SCISSOR_TEST)}function ye(t){t===void 0&&(t=e.TEXTURE0+M-1),F!==t&&(e.activeTexture(t),F=t)}function z(t,n,r){r===void 0&&(r=F===null?e.TEXTURE0+M-1:F);let i=te[r];i===void 0&&(i={type:void 0,texture:void 0},te[r]=i),(i.type!==t||i.texture!==n)&&(F!==r&&(e.activeTexture(r),F=r),e.bindTexture(t,n||oe[t]),i.type=t,i.texture=n)}function be(){let t=te[F];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function xe(){try{e.compressedTexImage2D(...arguments)}catch(e){W(`WebGLState:`,e)}}function Se(){try{e.compressedTexImage3D(...arguments)}catch(e){W(`WebGLState:`,e)}}function B(){try{e.texSubImage2D(...arguments)}catch(e){W(`WebGLState:`,e)}}function Ce(){try{e.texSubImage3D(...arguments)}catch(e){W(`WebGLState:`,e)}}function V(){try{e.compressedTexSubImage2D(...arguments)}catch(e){W(`WebGLState:`,e)}}function H(){try{e.compressedTexSubImage3D(...arguments)}catch(e){W(`WebGLState:`,e)}}function we(){try{e.texStorage2D(...arguments)}catch(e){W(`WebGLState:`,e)}}function Te(){try{e.texStorage3D(...arguments)}catch(e){W(`WebGLState:`,e)}}function Ee(){try{e.texImage2D(...arguments)}catch(e){W(`WebGLState:`,e)}}function De(){try{e.texImage3D(...arguments)}catch(e){W(`WebGLState:`,e)}}function Oe(t){return d[t]===void 0?e.getParameter(t):d[t]}function ke(t,n){d[t]!==n&&(e.pixelStorei(t,n),d[t]=n)}function Ae(t){ie.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),ie.copy(t))}function je(t){I.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),I.copy(t))}function Me(t,n){let r=l.get(n);r===void 0&&(r=new WeakMap,l.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),e.uniformBlockBinding(n,i,i),r.set(t,i))}function Ne(t,n,r){let i=l.get(n).get(t);c[i]!==r&&(e.bindBufferBase(e.UNIFORM_BUFFER,i,r),c[i]=r)}function Pe(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),o.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),e.pixelStorei(e.PACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_ALIGNMENT,4),e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,e.BROWSER_DEFAULT_WEBGL),e.pixelStorei(e.PACK_ROW_LENGTH,0),e.pixelStorei(e.PACK_SKIP_PIXELS,0),e.pixelStorei(e.PACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_ROW_LENGTH,0),e.pixelStorei(e.UNPACK_IMAGE_HEIGHT,0),e.pixelStorei(e.UNPACK_SKIP_PIXELS,0),e.pixelStorei(e.UNPACK_SKIP_ROWS,0),e.pixelStorei(e.UNPACK_SKIP_IMAGES,0),u={},d={},F=null,te={},f={},c={},p=new WeakMap,m=[],h=null,g=!1,_=null,v=null,y=null,b=null,x=null,S=null,C=null,w=new Y(0,0,0),T=0,E=!1,D=null,O=null,k=null,A=null,j=null,ie.set(0,0,e.canvas.width,e.canvas.height),I.set(0,0,e.canvas.width,e.canvas.height),a.reset(),o.reset(),s.reset()}return{buffers:{color:a,depth:o,stencil:s},enable:se,disable:L,bindFramebuffer:ce,drawBuffers:R,useProgram:le,setBlending:fe,setMaterial:pe,setFlipSided:me,setCullFace:he,setLineWidth:ge,setPolygonOffset:_e,setScissorTest:ve,activeTexture:ye,bindTexture:z,unbindTexture:be,compressedTexImage2D:xe,compressedTexImage3D:Se,texImage2D:Ee,texImage3D:De,pixelStorei:ke,getParameter:Oe,updateUBOMapping:Me,uniformBlockBinding:Ne,texStorage2D:we,texStorage3D:Te,texSubImage2D:B,texSubImage3D:Ce,compressedTexSubImage2D:V,compressedTexSubImage3D:H,scissor:Ae,viewport:je,reset:Pe}}function bl(e,t,n,r,i,a,o){let s=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,c=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),l=new bn,u=new WeakMap,d=new Set,f,p=new WeakMap,m=new Set,h=new FinalizationRegistry(e=>m.delete(e)),g=!1;try{g=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function _(e,t){return g?new OffscreenCanvas(e,t):en(`canvas`)}function v(e,t,n){let r=1,i=Ne(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);f===void 0&&(f=_(n,a));let o=t?_(n,a):f;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),U(`WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&U(`WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function y(e){return e.generateMipmaps}function b(t){e.generateMipmap(t)}function x(t){return t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:t.isWebGL3DRenderTarget?e.TEXTURE_3D:t.isWebGLArrayRenderTarget||t.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function S(n,r,i,a,o,s=!1){if(n!==null){if(e[n]!==void 0)return e[n];U(`WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let c;a&&(c=t.get(`EXT_texture_norm16`),c||U(`WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension`));let l=r;if(r===e.RED&&(i===e.FLOAT&&(l=e.R32F),i===e.HALF_FLOAT&&(l=e.R16F),i===e.UNSIGNED_BYTE&&(l=e.R8),i===e.UNSIGNED_SHORT&&c&&(l=c.R16_EXT),i===e.SHORT&&c&&(l=c.R16_SNORM_EXT)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.R8UI),i===e.UNSIGNED_SHORT&&(l=e.R16UI),i===e.UNSIGNED_INT&&(l=e.R32UI),i===e.BYTE&&(l=e.R8I),i===e.SHORT&&(l=e.R16I),i===e.INT&&(l=e.R32I)),r===e.RG&&(i===e.FLOAT&&(l=e.RG32F),i===e.HALF_FLOAT&&(l=e.RG16F),i===e.UNSIGNED_BYTE&&(l=e.RG8),i===e.UNSIGNED_SHORT&&c&&(l=c.RG16_EXT),i===e.SHORT&&c&&(l=c.RG16_SNORM_EXT)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RG8UI),i===e.UNSIGNED_SHORT&&(l=e.RG16UI),i===e.UNSIGNED_INT&&(l=e.RG32UI),i===e.BYTE&&(l=e.RG8I),i===e.SHORT&&(l=e.RG16I),i===e.INT&&(l=e.RG32I)),r===e.RGB_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGB8UI),i===e.UNSIGNED_SHORT&&(l=e.RGB16UI),i===e.UNSIGNED_INT&&(l=e.RGB32UI),i===e.BYTE&&(l=e.RGB8I),i===e.SHORT&&(l=e.RGB16I),i===e.INT&&(l=e.RGB32I)),r===e.RGBA_INTEGER&&(i===e.UNSIGNED_BYTE&&(l=e.RGBA8UI),i===e.UNSIGNED_SHORT&&(l=e.RGBA16UI),i===e.UNSIGNED_INT&&(l=e.RGBA32UI),i===e.BYTE&&(l=e.RGBA8I),i===e.SHORT&&(l=e.RGBA16I),i===e.INT&&(l=e.RGBA32I)),r===e.RGB&&(i===e.UNSIGNED_SHORT&&c&&(l=c.RGB16_EXT),i===e.SHORT&&c&&(l=c.RGB16_SNORM_EXT),i===e.UNSIGNED_INT_5_9_9_9_REV&&(l=e.RGB9_E5),i===e.UNSIGNED_INT_10F_11F_11F_REV&&(l=e.R11F_G11F_B10F)),r===e.RGBA){let t=s?qt:J.getTransfer(o);i===e.FLOAT&&(l=e.RGBA32F),i===e.HALF_FLOAT&&(l=e.RGBA16F),i===e.UNSIGNED_BYTE&&(l=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT&&c&&(l=c.RGBA16_EXT),i===e.SHORT&&c&&(l=c.RGBA16_SNORM_EXT),i===e.UNSIGNED_SHORT_4_4_4_4&&(l=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(l=e.RGB5_A1)}return(l===e.R16F||l===e.R32F||l===e.RG16F||l===e.RG32F||l===e.RGBA16F||l===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),l}function C(t,n){let r;return t?n===null||n===1014||n===1020?r=e.DEPTH24_STENCIL8:n===1015?r=e.DEPTH32F_STENCIL8:n===1012&&(r=e.DEPTH24_STENCIL8,U(`DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.`)):n===null||n===1014||n===1020?r=e.DEPTH_COMPONENT24:n===1015?r=e.DEPTH_COMPONENT32F:n===1012&&(r=e.DEPTH_COMPONENT16),r}function w(e,t){return y(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function T(e){let t=new WeakRef(e);r.get(e).__ref=t,m.add(t),h.register(e,t,t)}function E(e){let t=r.get(e).__ref;t!==void 0&&(m.delete(t),h.unregister(t))}function D(e){k(e.target)}function O(e){A(e.target)}function k(e){e.removeEventListener(`dispose`,D),E(e),M(e),e.isVideoTexture&&u.delete(e),e.isHTMLTexture&&d.delete(e)}function A(e){e.removeEventListener(`dispose`,O),E(e),P(e)}function j(){for(let e of m){let t=e.deref();t!==void 0&&(t.isRenderTarget===!0?A(t):k(t))}m.clear(),d.clear()}function M(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=p.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&N(e),Object.keys(i).length===0&&p.delete(n)}r.remove(e)}function N(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=p.get(i);delete a[n.__cacheKey],o.memory.textures--}function P(t){let n=r.get(t);n.__depthDisposeCallback&&n.__depthDisposeCallback();let i=t.depthTexture;if(i&&i.renderTarget===t&&k(i),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let a=t.textures;for(let t=0,n=a.length;t<n;t++){let n=r.get(a[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),o.memory.textures--),r.remove(a[t])}r.remove(t)}let ee=0;function F(){ee=0}function te(){return ee}function ne(e){ee=e}function re(){let e=ee;return e>=i.maxTextures&&U(`WebGLTextures: Trying to use `+(e+1)+` texture units while this GPU supports only `+i.maxTextures),ee+=1,e}function ie(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.mipmapsAutoUpdate),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function I(t,i){let a=r.get(t);if(t.isVideoTexture&&V(t),t.isRenderTargetTexture===!1&&t.isExternalTexture!==!0&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)U(`WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)U(`WebGLRenderer: Texture marked for update but image is incomplete`);else{pe(a,t,i);return}}else t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null);n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function ae(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?pe(a,t,i):(t.isExternalTexture&&(a.__webglTexture=t.sourceTexture?t.sourceTexture:null),n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i))}function oe(t,i){let a=r.get(t);t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version?pe(a,t,i):n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function se(t,i){let a=r.get(t);t.version>0&&a.__version!==t.version?me(a,t,i):n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let L={[H]:e.REPEAT,[we]:e.CLAMP_TO_EDGE,[Te]:e.MIRRORED_REPEAT},ce={[Ee]:e.NEAREST,[De]:e.NEAREST_MIPMAP_NEAREST,[Oe]:e.NEAREST_MIPMAP_LINEAR,[ke]:e.LINEAR,[Ae]:e.LINEAR_MIPMAP_NEAREST,[je]:e.LINEAR_MIPMAP_LINEAR},R={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function le(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&U(`WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,L[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,L[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,L[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,ce[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,ce[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,R[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function ue(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,D),T(n));let i=n.source,a=p.get(i);a===void 0&&(a={},p.set(i,a));let s=ie(n);if(s!==t.__cacheKey){a[s]===void 0&&(a[s]={texture:e.createTexture(),usedTimes:0},o.memory.textures++,r=!0),a[s].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&N(n)),t.__cacheKey=s,t.__webglTexture=a[s].texture}return r}function de(e,t,n){return Math.floor(Math.floor(e/n)/t)}function fe(t,r,i,a){let o=t.updateRanges;if(o.length===0)n.texSubImage2D(e.TEXTURE_2D,0,0,0,r.width,r.height,i,a,r.data);else{o.sort((e,t)=>e.start-t.start);let s=0;for(let e=1;e<o.length;e++){let t=o[s],n=o[e],i=t.start+t.count,a=de(n.start,r.width,4),c=de(t.start,r.width,4);n.start<=i+1&&a===c&&de(n.start+n.count-1,r.width,4)===a?t.count=Math.max(t.count,n.start+n.count-t.start):(++s,o[s]=n)}o.length=s+1;let c=n.getParameter(e.UNPACK_ROW_LENGTH),l=n.getParameter(e.UNPACK_SKIP_PIXELS),u=n.getParameter(e.UNPACK_SKIP_ROWS);n.pixelStorei(e.UNPACK_ROW_LENGTH,r.width);for(let t=0,s=o.length;t<s;t++){let s=o[t],c=Math.floor(s.start/4),l=Math.ceil(s.count/4),u=c%r.width,d=Math.floor(c/r.width),f=l;n.pixelStorei(e.UNPACK_SKIP_PIXELS,u),n.pixelStorei(e.UNPACK_SKIP_ROWS,d),n.texSubImage2D(e.TEXTURE_2D,0,u,d,f,1,i,a,r.data)}t.clearUpdateRanges(),n.pixelStorei(e.UNPACK_ROW_LENGTH,c),n.pixelStorei(e.UNPACK_SKIP_PIXELS,l),n.pixelStorei(e.UNPACK_SKIP_ROWS,u)}}function pe(t,o,s){let c=e.TEXTURE_2D;(o.isDataArrayTexture||o.isCompressedArrayTexture)&&(c=e.TEXTURE_2D_ARRAY),o.isData3DTexture&&(c=e.TEXTURE_3D);let l=ue(t,o),u=o.source;n.bindTexture(c,t.__webglTexture,e.TEXTURE0+s);let f=r.get(u);if(u.version!==f.__version||l===!0){if(n.activeTexture(e.TEXTURE0+s),!(typeof ImageBitmap<`u`&&o.image instanceof ImageBitmap)){let t=J.getPrimaries(J.workingColorSpace),r=o.colorSpace===``?null:J.getPrimaries(o.colorSpace),i=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,i)}n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment);let t=v(o.image,!1,i.maxTextureSize);t=Me(o,t);let r=a.convert(o.format,o.colorSpace),p=a.convert(o.type),m=S(o.internalFormat,r,p,o.normalized,o.colorSpace,o.isVideoTexture);le(c,o);let h,g=o.mipmaps,_=o.isVideoTexture!==!0,x=f.__version===void 0||l===!0,T=u.dataReady,E=w(o,t);if(o.isDepthTexture)m=C(o.format===Ye,o.type),x&&(_?n.texStorage2D(e.TEXTURE_2D,1,m,t.width,t.height):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,null));else if(o.isDataTexture){if(g.length>0){_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data);o.generateMipmaps=!1}else _?(x&&n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height),T&&fe(o,t,r,p)):n.texImage2D(e.TEXTURE_2D,0,m,t.width,t.height,0,r,p,t.data)}else if(o.isCompressedTexture){if(o.isCompressedArrayTexture){_&&x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,g[0].width,g[0].height,t.depth);for(let i=0,a=g.length;i<a;i++)if(h=g[i],o.format!==1023){if(r!==null){if(_){if(T){if(o.layerUpdates.size>0){let t=So(h.width,h.height,o.format,o.type);for(let a of o.layerUpdates){let o=h.data.subarray(a*t/h.data.BYTES_PER_ELEMENT,(a+1)*t/h.data.BYTES_PER_ELEMENT);n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,a,h.width,h.height,1,r,o)}}else n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,h.data)}}else n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,h.data,0,0)}else U(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`)}else _?T&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,i,0,0,0,h.width,h.height,t.depth,r,p,h.data):n.texImage3D(e.TEXTURE_2D_ARRAY,i,m,h.width,h.height,t.depth,0,r,p,h.data);o.layerUpdates.size>0&&o.clearLayerUpdates()}else{_&&x&&n.texStorage2D(e.TEXTURE_2D,E,m,g[0].width,g[0].height);for(let t=0,i=g.length;t<i;t++)h=g[t],o.format===1023?_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,p,h.data):n.texImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,r,p,h.data):r===null?U(`WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):_?T&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,h.width,h.height,r,h.data):n.compressedTexImage2D(e.TEXTURE_2D,t,m,h.width,h.height,0,h.data)}}else if(o.isDataArrayTexture){if(_){if(x&&n.texStorage3D(e.TEXTURE_2D_ARRAY,E,m,t.width,t.height,t.depth),T){if(o.layerUpdates.size>0){let i=So(t.width,t.height,o.format,o.type);for(let a of o.layerUpdates){let o=t.data.subarray(a*i/t.data.BYTES_PER_ELEMENT,(a+1)*i/t.data.BYTES_PER_ELEMENT);n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,a,t.width,t.height,1,r,p,o)}o.clearLayerUpdates()}else n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)}}else n.texImage3D(e.TEXTURE_2D_ARRAY,0,m,t.width,t.height,t.depth,0,r,p,t.data)}else if(o.isData3DTexture)_?(x&&n.texStorage3D(e.TEXTURE_3D,E,m,t.width,t.height,t.depth),T&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,t.width,t.height,t.depth,r,p,t.data)):n.texImage3D(e.TEXTURE_3D,0,m,t.width,t.height,t.depth,0,r,p,t.data);else if(o.isFramebufferTexture){if(x){if(_)n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height);else{let i=t.width,a=t.height;for(let t=0;t<E;t++)n.texImage2D(e.TEXTURE_2D,t,m,i,a,0,r,p,null),i>>=1,a>>=1}}}else if(o.isHTMLTexture){if(`texElementImage2D`in e){let n=e.canvas;if(n.hasAttribute(`layoutsubtree`)||n.setAttribute(`layoutsubtree`,`true`),t.parentNode!==n){n.appendChild(t),d.add(o),n.onpaint=e=>{let t=e.changedElements;for(let e of d)t.includes(e.image)&&(e.needsUpdate=!0)},n.requestPaint();return}if(e.texElementImage2D.length===3)e.texElementImage2D(e.TEXTURE_2D,e.RGBA8,t);else{let n=e.RGBA,r=e.RGBA,i=e.UNSIGNED_BYTE;e.texElementImage2D(e.TEXTURE_2D,0,n,r,i,t)}e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE)}}else if(g.length>0){if(_&&x){let t=Ne(g[0]);n.texStorage2D(e.TEXTURE_2D,E,m,t.width,t.height)}for(let t=0,i=g.length;t<i;t++)h=g[t],_?T&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,r,p,h):n.texImage2D(e.TEXTURE_2D,t,m,r,p,h);o.generateMipmaps=!1}else if(_){if(x){let r=Ne(t);n.texStorage2D(e.TEXTURE_2D,E,m,r.width,r.height)}T&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,r,p,t)}else n.texImage2D(e.TEXTURE_2D,0,m,r,p,t);y(o)&&o.mipmapsAutoUpdate===!0&&b(c),f.__version=u.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function me(t,o,s){if(o.image.length!==6)return;let c=ue(t,o),l=o.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+s);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+s);let t=J.getPrimaries(J.workingColorSpace),r=o.colorSpace===``?null:J.getPrimaries(o.colorSpace),d=o.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;n.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,o.flipY),n.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,o.premultiplyAlpha),n.pixelStorei(e.UNPACK_ALIGNMENT,o.unpackAlignment),n.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=o.isCompressedTexture||o.image[0].isCompressedTexture,p=o.image[0]&&o.image[0].isDataTexture,m=[];for(let e=0;e<6;e++)!f&&!p?m[e]=v(o.image[e],!0,i.maxCubemapSize):m[e]=p?o.image[e].image:o.image[e],m[e]=Me(o,m[e]);let h=m[0],g=a.convert(o.format,o.colorSpace),_=a.convert(o.type),x=S(o.internalFormat,g,_,o.normalized,o.colorSpace),T=o.isVideoTexture!==!0,E=u.__version===void 0||c===!0,D=l.dataReady,O=w(o,h);le(e.TEXTURE_CUBE_MAP,o);let k;if(o.isDepthTexture){if(x=C(o.format===Ye,o.type),E){if(T)n.texStorage2D(e.TEXTURE_CUBE_MAP,1,x,h.width,h.height);else for(let t=0;t<6;t++)n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,h.width,h.height,0,g,_,null)}}else if(f){T&&E&&n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,h.width,h.height);for(let t=0;t<6;t++){k=m[t].mipmaps;for(let r=0;r<k.length;r++){let i=k[r];o.format===1023?T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,g,_,i.data):g===null?U(`WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):T?D&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,x,i.width,i.height,0,i.data)}}}else{if(k=o.mipmaps,T&&E){k.length>0&&O++;let t=Ne(m[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,O,x,t.width,t.height)}for(let t=0;t<6;t++)if(p){T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,m[t].width,m[t].height,g,_,m[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,m[t].width,m[t].height,0,g,_,m[t].data);for(let r=0;r<k.length;r++){let i=k[r].image[t].image;T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,i.width,i.height,0,g,_,i.data)}}else{T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,m[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,x,g,_,m[t]);for(let r=0;r<k.length;r++){let i=k[r];T?D&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,x,g,_,i.image[t])}}}y(o)&&o.mipmapsAutoUpdate===!0&&b(e.TEXTURE_CUBE_MAP),u.__version=l.version,o.onUpdate&&o.onUpdate(o)}t.__version=o.version}function he(t,i,o,c,l,u){let d=a.convert(o.format,o.colorSpace),f=a.convert(o.type),p=S(o.internalFormat,d,f,o.normalized,o.colorSpace),m=r.get(i),h=r.get(o);if(h.__renderTarget=i,!m.__hasExternalTextures){let t=Math.max(1,i.width>>u),r=Math.max(1,i.height>>u);l===e.TEXTURE_3D||l===e.TEXTURE_2D_ARRAY?n.texImage3D(l,u,p,t,r,i.depth,0,d,f,null):n.texImage2D(l,u,p,t,r,0,d,f,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),Ce(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,c,l,h.__webglTexture,0,B(i)):(l===e.TEXTURE_2D||l>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&l<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,c,l,h.__webglTexture,u),n.bindFramebuffer(e.FRAMEBUFFER,null)}function ge(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer){let i=n.depthTexture,a=i&&i.isDepthTexture?i.type:null,o=C(n.stencilBuffer,a),c=n.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Ce(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,B(n),o,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,B(n),o,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,o,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,c,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let o=t[i],c=a.convert(o.format,o.colorSpace),l=a.convert(o.type),u=S(o.internalFormat,c,l,o.normalized,o.colorSpace);Ce(n)?s.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,B(n),u,n.width,n.height):r?e.renderbufferStorageMultisample(e.RENDERBUFFER,B(n),u,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,u,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function _e(t,i,a){let o=i.isWebGLCubeRenderTarget===!0;if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.`);let c=r.get(i.depthTexture);c.__renderTarget=i;let l=o?i.depthTexture.image[0]:i.depthTexture.image;c.__webglTexture&&l.width===i.width&&l.height===i.height||(l.width=i.width,l.height=i.height,i.depthTexture.needsUpdate=!0),o?se(i.depthTexture,0):I(i.depthTexture,0);let u=c.__webglTexture,d=B(i),f=o?e.TEXTURE_CUBE_MAP_POSITIVE_X+a:e.TEXTURE_2D,p=i.depthTexture.format===1027?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(i.depthTexture.format===1026)Ce(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else if(i.depthTexture.format===1027)Ce(i)?s.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,p,f,u,0,d):e.framebufferTexture2D(e.FRAMEBUFFER,p,f,u,0);else throw Error(`THREE.WebGLTextures: Unknown depthTexture format.`)}function ve(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(i.__boundDepthTexture!==t.depthTexture){let e=t.depthTexture;if(i.__depthDisposeCallback&&i.__depthDisposeCallback(),e){let t=()=>{delete i.__boundDepthTexture,delete i.__depthDisposeCallback,e.removeEventListener(`dispose`,t)};e.addEventListener(`dispose`,t),i.__depthDisposeCallback=t}i.__boundDepthTexture=e}if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)for(let e=0;e<6;e++)_e(i.__webglFramebuffer[e],t,e);else t.texture.mipmaps.length>0?_e(i.__webglFramebuffer[0],t,0):_e(i.__webglFramebuffer,t,0)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)if(n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]===void 0)i.__webglDepthbuffer[r]=e.createRenderbuffer(),ge(i.__webglDepthbuffer[r],t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,a=i.__webglDepthbuffer[r];e.bindRenderbuffer(e.RENDERBUFFER,a),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,a)}}else if(t.texture.mipmaps.length>0?n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[0]):n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer===void 0)i.__webglDepthbuffer=e.createRenderbuffer(),ge(i.__webglDepthbuffer,t,!1);else{let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,r=i.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,r),e.framebufferRenderbuffer(e.FRAMEBUFFER,n,e.RENDERBUFFER,r)}n.bindFramebuffer(e.FRAMEBUFFER,null)}function ye(t,n,i){let a=r.get(t);n!==void 0&&he(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&ve(t)}function z(t){let i=t.texture,s=r.get(t),c=r.get(i);t.addEventListener(`dispose`,O),T(t);let l=t.textures,u=t.isWebGLCubeRenderTarget===!0,d=l.length>1;if(d||(c.__webglTexture===void 0&&(c.__webglTexture=e.createTexture()),c.__version=i.version,o.memory.textures++),u){s.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps.length>0){s.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)s.__webglFramebuffer[t][n]=e.createFramebuffer()}else s.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps.length>0){s.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)s.__webglFramebuffer[t]=e.createFramebuffer()}else s.__webglFramebuffer=e.createFramebuffer();if(d)for(let t=0,n=l.length;t<n;t++){let n=r.get(l[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),o.memory.textures++)}if(t.samples>0&&Ce(t)===!1){s.__webglMultisampledFramebuffer=e.createFramebuffer(),s.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,s.__webglMultisampledFramebuffer);for(let n=0;n<l.length;n++){let r=l[n];s.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,s.__webglColorRenderbuffer[n]);let i=a.convert(r.format,r.colorSpace),o=a.convert(r.type),c=S(r.internalFormat,i,o,r.normalized,r.colorSpace,t.isXRRenderTarget===!0),u=B(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,u,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,s.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(s.__webglDepthRenderbuffer=e.createRenderbuffer(),ge(s.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(u){n.bindTexture(e.TEXTURE_CUBE_MAP,c.__webglTexture),le(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)he(s.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else he(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);y(i)?b(e.TEXTURE_CUBE_MAP):i.mipmaps.length>0&&e.texParameteri(e.TEXTURE_CUBE_MAP,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}else if(d){for(let i=0,a=l.length;i<a;i++){let a=l[i],o=r.get(a),c=e.TEXTURE_2D;(t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(c=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(c,o.__webglTexture),le(c,a),he(s.__webglFramebuffer,t,a,e.COLOR_ATTACHMENT0+i,c,0),y(a)&&b(c)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,c.__webglTexture),le(r,i),i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)he(s.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else he(s.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);y(i)?b(r):i.mipmaps.length>0&&e.texParameteri(r,e.TEXTURE_MAX_LEVEL,i.mipmaps.length-1),n.unbindTexture()}t.depthBuffer&&ve(t)}function be(e){let t=e.textures;for(let i=0,a=t.length;i<a;i++){let a=t[i];if(y(a)&&a.mipmapsAutoUpdate===!0){let t=x(e),i=r.get(a).__webglTexture;n.bindTexture(t,i),b(t),n.unbindTexture()}}}let xe=[];function Se(t){if(t.samples>0){if(Ce(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),t.texture.mipmaps.length>0?n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer[0]):n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){if(t.resolveDepthBuffer&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&t.resolveStencilBuffer&&(s|=e.STENCIL_BUFFER_BIT)),d){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]);let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),c===!0&&(xe.length=0,xe.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&xe.push(l),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,xe))}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}else if(t.depthBuffer&&t.storeMultisampledDepthBuffer===!1&&c){let n=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[n])}}}function B(e){return Math.min(i.maxSamples,e.samples)}function Ce(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function V(e){let t=o.render.frame;u.get(e)!==t&&(u.set(e,t),e.update())}function Me(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(J.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&U(`WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):W(`WebGLTextures: Unsupported texture color space:`,n)),t}function Ne(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(l.width=e.naturalWidth||e.width,l.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(l.width=e.displayWidth,l.height=e.displayHeight):(l.width=e.width,l.height=e.height),l}this.allocateTextureUnit=re,this.resetTextureUnits=F,this.getTextureUnits=te,this.setTextureUnits=ne,this.setTexture2D=I,this.setTexture2DArray=ae,this.setTexture3D=oe,this.setTextureCube=se,this.rebindTextures=ye,this.setupRenderTarget=z,this.updateRenderTargetMipmap=be,this.updateMultisampleRenderTarget=Se,this.setupDepthRenderbuffer=ve,this.setupFrameBufferTexture=he,this.useMultisampledRTT=Ce,this.dispose=j}function xl(e,t){function n(n,r=``){let i,a=J.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===35899)return e.UNSIGNED_INT_10F_11F_11F_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196||n===37492||n===37496||n===37488||n===37489||n===37490||n===37491){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===36196||n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC;if(n===37488)return i.COMPRESSED_R11_EAC;if(n===37489)return i.COMPRESSED_SIGNED_R11_EAC;if(n===37490)return i.COMPRESSED_RG11_EAC;if(n===37491)return i.COMPRESSED_SIGNED_RG11_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36283)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var Sl=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Cl=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,wl=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new ha(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Ea({vertexShader:Sl,fragmentShader:Cl,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ui(new _a(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Tl=class extends ln{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=typeof XRWebGLBinding<`u`,h=new wl,g={},_=t.getContextAttributes(),v=null,y=null,b=[],x=[],S=new bn,C=null,w=null,T=new ro;T.viewport=new Rn;let E=new ro;E.viewport=new Rn;let D=[T,E],O=new co,k=null,A=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new yr,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new yr,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new yr,b[e]=t),t.getHandSpace()};function j(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function M(){r.removeEventListener(`select`,j),r.removeEventListener(`selectstart`,j),r.removeEventListener(`selectend`,j),r.removeEventListener(`squeeze`,j),r.removeEventListener(`squeezestart`,j),r.removeEventListener(`squeezeend`,j),r.removeEventListener(`end`,M),r.removeEventListener(`inputsourceschange`,N);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}k=null,A=null,h.reset();for(let e in g)delete g[e];if(e.setRenderTarget(v),f=null,d=null,u=null,r=null,y=null,ne.stop(),n.isPresenting=!1,e.setPixelRatio(C),e.setSize(S.width,S.height,!1),w!==null){let e=w.camera;e.fov=w.fov,e.zoom=w.zoom,e.updateProjectionMatrix(),w=null}n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&U(`WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&U(`WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u===null&&m&&(u=new XRWebGLBinding(r,t)),u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(v=e.getRenderTarget(),r.addEventListener(`select`,j),r.addEventListener(`selectstart`,j),r.addEventListener(`selectend`,j),r.addEventListener(`squeeze`,j),r.addEventListener(`squeezestart`,j),r.addEventListener(`squeezeend`,j),r.addEventListener(`end`,M),r.addEventListener(`inputsourceschange`,N),_.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(S),m&&`createProjectionLayer`in XRWebGLBinding.prototype){let n=null,a=null,o=null;_.depth&&(o=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=_.stencil?Ye:Je,a=_.stencil?He:Le);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=this.getBinding(),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),y=new Bn(d.textureWidth,d.textureHeight,{format:qe,type:Me,depthTexture:new pa(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:_.stencil,colorSpace:e.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1,storeMultisampledDepthBuffer:d.ignoreDepthValues===!1,storeMultisampledStencilBuffer:d.ignoreDepthValues===!1})}else{let n={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),y=new Bn(f.framebufferWidth,f.framebufferHeight,{format:qe,type:Me,colorSpace:e.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1,storeMultisampledDepthBuffer:f.ignoreDepthValues===!1,storeMultisampledStencilBuffer:f.ignoreDepthValues===!1})}y.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),ne.setContext(r),ne.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode},this.getDepthTexture=function(){return h.getDepthTexture()};function N(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}function P(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;let t=e.near,n=e.far;h.texture!==null&&(h.depthNear>0&&(t=h.depthNear),h.depthFar>0&&(n=h.depthFar)),O.near=E.near=T.near=t,O.far=E.far=T.far=n,(k!==O.near||A!==O.far)&&(r.updateRenderState({depthNear:O.near,depthFar:O.far}),k=O.near,A=O.far),O.layers.mask=e.layers.mask|6,T.layers.mask=O.layers.mask&-5,E.layers.mask=O.layers.mask&-3;let i=e.parent,a=O.cameras;P(O,i);for(let e=0;e<a.length;e++)P(a[e],i);O.projectionMatrix.copy(T.projectionMatrix),O.projectionMatrixInverse.copy(T.projectionMatrixInverse),w===null&&e.isPerspectiveCamera&&(w={camera:e,fov:e.fov,zoom:e.zoom}),ee(e,O,i)};function ee(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=fn*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return O},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return h.texture!==null},this.getDepthSensingMesh=function(){return h.getMesh(O)},this.getCameraTexture=function(e){return g[e]};let F=null;function te(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(y,f.framebuffer),e.setRenderTarget(y));let i=!1;t.length!==O.cameras.length&&(O.cameras.length=0,i=!0);for(let n=0;n<t.length;n++){let r=t[n],a=null;if(f!==null)a=f.getViewport(r);else{let t=u.getViewSubImage(d,r);a=t.viewport,n===0&&(e.setRenderTargetTextures(y,t.colorTexture,t.depthStencilTexture),e.setRenderTarget(y))}let o=D[n];o===void 0&&(o=new ro,o.layers.enable(n),o.viewport=new Rn,D[n]=o),o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(r.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),n===0&&(O.matrix.copy(o.matrix),O.matrix.decompose(O.position,O.quaternion,O.scale)),i===!0&&O.cameras.push(o)}let a=r.enabledFeatures;if(a&&a.includes(`depth-sensing`)&&r.depthUsage==`gpu-optimized`&&m){u=n.getBinding();let e=u.getDepthInformation(t[0]);e&&e.isValid&&e.texture&&h.init(e,r.renderState)}if(a&&a.includes(`camera-access`)&&m){e.state.unbindTexture(),u=n.getBinding();for(let e=0;e<t.length;e++){let n=t[e].camera;if(n){let e=g[n];e||(e=new ha,g[n]=e);let t=u.getCameraImage(n);e.sourceTexture=t}}}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}F&&F(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let ne=new wo;ne.setAnimationLoop(te),this.setAnimationLoop=function(e){F=e},this.dispose=function(){}}},El=new Un,Dl=new q;Dl.set(-1,0,0,0,1,0,0,0,1);function Ol(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,Sa(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isNodeMaterial?t.uniformsNeedUpdate=!1:t.isMeshBasicMaterial?a(e,t):t.isMeshLambertMaterial?(a(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(e,r){e.opacity.value=r.opacity,r.color&&e.diffuse.value.copy(r.color),r.emissive&&e.emissive.value.copy(r.emissive).multiplyScalar(r.emissiveIntensity),r.map&&(e.map.value=r.map,n(r.map,e.mapTransform)),r.alphaMap&&(e.alphaMap.value=r.alphaMap,n(r.alphaMap,e.alphaMapTransform)),r.bumpMap&&(e.bumpMap.value=r.bumpMap,n(r.bumpMap,e.bumpMapTransform),e.bumpScale.value=r.bumpScale,r.side===1&&(e.bumpScale.value*=-1)),r.normalMap&&(e.normalMap.value=r.normalMap,n(r.normalMap,e.normalMapTransform),e.normalScale.value.copy(r.normalScale),r.side===1&&e.normalScale.value.negate()),r.displacementMap&&(e.displacementMap.value=r.displacementMap,n(r.displacementMap,e.displacementMapTransform),e.displacementScale.value=r.displacementScale,e.displacementBias.value=r.displacementBias),r.emissiveMap&&(e.emissiveMap.value=r.emissiveMap,n(r.emissiveMap,e.emissiveMapTransform)),r.specularMap&&(e.specularMap.value=r.specularMap,n(r.specularMap,e.specularMapTransform)),r.alphaTest>0&&(e.alphaTest.value=r.alphaTest);let i=t.get(r),a=i.envMap,o=i.envMapRotation;a&&(e.envMap.value=a,e.envMapRotation.value.setFromMatrix4(El.makeRotationFromEuler(o)).transpose(),a.isCubeTexture&&a.isRenderTargetTexture===!1&&e.envMapRotation.value.premultiply(Dl),e.reflectivity.value=r.reflectivity,e.ior.value=r.ior,e.refractionRatio.value=r.refractionRatio),r.lightMap&&(e.lightMap.value=r.lightMap,e.lightMapIntensity.value=r.lightMapIntensity,n(r.lightMap,e.lightMapTransform)),r.aoMap&&(e.aoMap.value=r.aoMap,e.aoMapIntensity.value=r.aoMapIntensity,n(r.aoMap,e.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.diffuseRoughness>0&&(e.diffuseRoughness.value=t.diffuseRoughness,t.diffuseRoughnessMap&&(e.diffuseRoughnessMap.value=t.diffuseRoughnessMap,n(t.diffuseRoughnessMap,e.diffuseRoughnessMapTransform))),t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.dispersion>0&&(e.dispersion.value=t.dispersion),t.retroreflectivity>0&&(e.retroreflectivity.value=t.retroreflectivity),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessMinimum,e.iridescenceThicknessMaximum.value=t.iridescenceThicknessMaximum,t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function kl(e,t,n,r){let i={},a={};function o(e,t){let n=t.program;r.uniformBlockBinding(e,n,i[e.id])}function s(e,n){let o=i[e.id];o===void 0&&(m(e),o=c(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let u=t.render.frame;a[e.id]!==u&&(l(e),a[e.id]=u)}function c(t){let n=e.createBuffer(),r=t.__size,i=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,n),e.bufferData(e.UNIFORM_BUFFER,r,i),e.bindBuffer(e.UNIFORM_BUFFER,null),n}function l(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let e=0,t=r.length;e<t;e++){let t=r[e];if(Array.isArray(t))for(let n=0,r=t.length;n<r;n++)u(t[n],e,n,a);else u(t,e,0,a)}e.bindBuffer(e.UNIFORM_BUFFER,null)}function u(t,n,r,i){if(f(t,n,r,i)===!0){let n=t.__offset,r=t.value;if(Array.isArray(r)){let e=0;for(let n=0;n<r.length;n++){let i=r[n],a=h(i,!0);d(i,t.__data,e),e+=a.storage/Float32Array.BYTES_PER_ELEMENT}}else d(r,t.__data,0);e.bufferSubData(e.UNIFORM_BUFFER,n,t.__data)}}function d(e,t,n){typeof e==`number`||typeof e==`boolean`?t[n]=e:e.isMatrix3?(t[n]=e.elements[0],t[n+1]=e.elements[1],t[n+2]=e.elements[2],t[n+3]=0,t[n+4]=e.elements[3],t[n+5]=e.elements[4],t[n+6]=e.elements[5],t[n+7]=0,t[n+8]=e.elements[6],t[n+9]=e.elements[7],t[n+10]=e.elements[8],t[n+11]=0):ArrayBuffer.isView(e)?t.set(e.subarray(0,t.length-n),n):e.toArray(t,n)}function f(e,t,n,r){let i=e.value,a=t+`_`+n;if(Array.isArray(i)){r[a]===void 0&&(r[a]=[]);let e=r[a],t=!1;for(let n=0;n<i.length;n++)p(i[n],e,n)===!0&&(t=!0);return t}return p(i,r,a)}function p(e,t,n){if(t[n]===void 0)return t[n]=typeof e==`number`||typeof e==`boolean`?e:ArrayBuffer.isView(e)?e.slice():e.clone(),!0;{let r=t[n];if(typeof e==`number`||typeof e==`boolean`){if(r!==e)return t[n]=e,!0}else if(ArrayBuffer.isView(e))return!0;else if(r.equals(e)===!1)return r.copy(e),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let i=0,a=r.length;i<a;i++){let a=r[i],o=Array.isArray(a.value)?a.value:[a.value],s=Array.isArray(t[e])||Array.isArray(a.value),c=n;for(let e=0,t=o.length;e<t;e++){let t=o[e],r=h(t,s),i=n%16,a=i%r.boundary,l=i+a;n+=a,l!==0&&16-l<r.storage&&(n+=16-l),e===0&&(c=n),n+=r.storage}a.__data=new(a.type===`int`?Int32Array:a.type===`uint`?Uint32Array:Float32Array)((n-c)/Float32Array.BYTES_PER_ELEMENT),a.__offset=c}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e,t){let n={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(n.boundary=4,n.storage=4):e.isVector2?(n.boundary=8,n.storage=8):e.isVector3||e.isColor?(n.boundary=16,n.storage=12):e.isVector4?(n.boundary=16,n.storage=16):e.isMatrix3?(n.boundary=16,n.storage=48):e.isMatrix4?(n.boundary=16,n.storage=64):e.isTexture?U(`WebGLRenderer: Texture samplers can not be part of an uniforms group.`):ArrayBuffer.isView(e)?(n.boundary=16,n.storage=e.byteLength):U(`WebGLRenderer: Unsupported uniform value type.`,e),t===!0&&(n.boundary=16,n.storage=Math.ceil(n.storage/16)*16),n}function g(t){let n=t.target;n.removeEventListener(`dispose`,g),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);i={},a={}}return{bind:o,update:s,dispose:_}}var Al=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),jl=null;function Ml(){return jl===null&&(jl=new Ki(Al,16,16,Qe,ze),jl.name=`DFG_LUT`,jl.minFilter=ke,jl.magFilter=ke,jl.wrapS=we,jl.wrapT=we,jl.generateMipmaps=!1,jl.needsUpdate=!0),jl}var Nl=class{constructor(e={}){let{canvas:t=tn(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1,reversedDepthBuffer:d=!1,outputBufferType:f=Me}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);p=n.getContextAttributes().alpha}else p=a;let m=f,h=new Set([et,$e,Ze]),g=new Set([Me,Le,Fe,He,Be,Ve]),_=new Uint32Array(4),v=new Int32Array(4),y={textures:[],min:[],max:[],resolution:[]},b=null,x=null,S=[],C=[],w=null;this.domElement=t,this.debug={checkShaderErrors:!0,diagnostics:{keywords:!1},onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=0,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let T=this,E=!1,D=null,O=null,k=null,A=null;this._outputColorSpace=Gt;let j=0,M=0,N=null,P=-1,ee=null,F=new Rn,te=new Rn,ne=null,re=new Y(0),ie=0,I=t.width,ae=t.height,oe=1,se=null,L=null,ce=new Rn(0,0,I,ae),R=new Rn(0,0,I,ae),le=!1,ue=new Xi,de=new Qi,fe=!1,pe=!1,me=new Un,he=new K,ge=new Rn,_e={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ve=!1;function ye(){return N===null?oe:1}let z=n;function be(e,n){return t.getContext(e,n)}let xe,Se,B,Ce,V,H,we,Te,Ee,De,Oe,ke,Ae,Ne,Pe,Ie,Re,Ue,We,Ge,Ke,qe,Je;try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r187`),t.addEventListener(`webglcontextlost`,Qe,!1),t.addEventListener(`webglcontextrestored`,tt,!1),t.addEventListener(`webglcontextcreationerror`,nt,!1),z===null){let t=`webgl2`;if(z=be(t,e),z===null)throw be(t)?Error(`THREE.WebGLRenderer: Error creating WebGL context with your selected attributes.`):Error(`THREE.WebGLRenderer: Error creating WebGL context.`)}Ye()}catch(e){throw t.removeEventListener(`webglcontextlost`,Qe,!1),t.removeEventListener(`webglcontextrestored`,tt,!1),t.removeEventListener(`webglcontextcreationerror`,nt,!1),W(`WebGLRenderer: `+e.message),e}function Ye(){xe=new $o(z),xe.init(),Ke=new xl(z,xe),Se=new No(z,xe,e,Ke),B=new yl(z,xe),Se.reversedDepthBuffer&&d&&B.buffers.depth.setReversed(!0),O=z.createFramebuffer(),k=z.createFramebuffer(),A=z.createFramebuffer(),Ce=new ns(z),V=new $c,H=new bl(z,xe,B,V,Se,Ke,Ce),we=new Qo(T),Te=new To(z),qe=new jo(z,Te),Ee=new es(z,Te,Ce,qe),De=new is(z,Ee,Te,qe,Ce),Ue=new rs(z,Se,H),Pe=new Po(V),Oe=new Qc(T,we,xe,Se,qe,Pe),ke=new Ol(T,V),Ae=new rl,Ne=new ul(xe),Re=new Ao(T,we,B,De,p,s),Ie=new vl(T,De,Se),Je=new kl(z,Ce,Se,B),We=new Mo(z,xe,Ce),Ge=new ts(z,xe,Ce),Ce.programs=Oe.programs,T.capabilities=Se,T.extensions=xe,T.properties=V,T.renderLists=Ae,T.shadowMap=Ie,T.state=B,T.info=Ce}m!==1009&&(w=new os(m,t.width,t.height,o,r,i));let Xe=new Tl(T,z);this.xr=Xe,this.getContext=function(){return z},this.getContextAttributes=function(){return z.getContextAttributes()},this.forceContextLoss=function(){let e=xe.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=xe.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return oe},this.setPixelRatio=function(e){e!==void 0&&(oe=e,this.setSize(I,ae,!1))},this.getSize=function(e){return e.set(I,ae)},this.setSize=function(e,n,r=!0){Xe.isPresenting?U(`WebGLRenderer: Can't change size while VR device is presenting.`):(I=e,ae=n,t.width=Math.floor(e*oe),t.height=Math.floor(n*oe),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),w!==null&&w.setSize(t.width,t.height),this.setViewport(0,0,e,n))},this.getDrawingBufferSize=function(e){return e.set(I*oe,ae*oe).floor()},this.setDrawingBufferSize=function(e,n,r){I=e,ae=n,oe=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.setEffects=function(e){if(m===1009)W(`WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.`);else{if(e){for(let t=0;t<e.length;t++)if(e[t].isOutputPass===!0){U(`WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.`);break}}w.setEffects(e||[])}},this.getCurrentViewport=function(e){return e.copy(F)},this.getViewport=function(e){return e.copy(ce)},this.setViewport=function(e,t,n,r){e.isVector4?ce.set(e.x,e.y,e.z,e.w):ce.set(e,t,n,r),B.viewport(F.copy(ce).multiplyScalar(ye()).round())},this.getScissor=function(e){return e.copy(R)},this.setScissor=function(e,t,n,r){e.isVector4?R.set(e.x,e.y,e.z,e.w):R.set(e,t,n,r),B.scissor(te.copy(R).multiplyScalar(ye()).round())},this.getScissorTest=function(){return le},this.setScissorTest=function(e){B.setScissorTest(le=e)},this.setOpaqueSort=function(e){se=e},this.setTransparentSort=function(e){L=e},this.getClearColor=function(e){return e.copy(Re.getClearColor())},this.setClearColor=function(){Re.setClearColor(...arguments)},this.getClearAlpha=function(){return Re.getClearAlpha()},this.setClearAlpha=function(){Re.setClearAlpha(...arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(N!==null){let t=N.texture.format;e=h.has(t)}if(e){let e=N.texture.type,t=g.has(e),n=Re.getClearColor(),r=Re.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(_[0]=i,_[1]=a,_[2]=o,_[3]=r,z.clearBufferuiv(z.COLOR,0,_)):(v[0]=i,v[1]=a,v[2]=o,v[3]=r,z.clearBufferiv(z.COLOR,0,v))}else r|=z.COLOR_BUFFER_BIT}t&&(r|=z.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),n&&(r|=z.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),r!==0&&z.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(e){e.setRenderer(this),D=e},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Qe,!1),t.removeEventListener(`webglcontextrestored`,tt,!1),t.removeEventListener(`webglcontextcreationerror`,nt,!1),Re.dispose(),Ae.dispose(),Ne.dispose(),H.dispose(),V.dispose(),we.dispose(),De.dispose(),Ee.dispose(),qe.dispose(),Je.dispose(),Oe.dispose(),Xe.dispose(),Xe.removeEventListener(`sessionstart`,lt),Xe.removeEventListener(`sessionend`,ut),dt.stop()};function Qe(e){e.preventDefault(),rn(`WebGLRenderer: Context Lost.`),E=!0}function tt(){rn(`WebGLRenderer: Context Restored.`),E=!1;let e=Ce.autoReset,t=Ie.enabled,n=Ie.autoUpdate,r=Ie.needsUpdate,i=Ie.type;Ye(),Ce.autoReset=e,Ie.enabled=t,Ie.autoUpdate=n,Ie.needsUpdate=r,Ie.type=i}function nt(e){W(`WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function rt(e){let t=e.target;t.removeEventListener(`dispose`,rt),it(t)}function it(e){at(e),V.remove(e)}function at(e){let t=V.get(e).programs;t!==void 0&&(t.forEach(function(e){Oe.releaseProgram(e)}),e.isShaderMaterial&&Oe.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=_e);let o=i.isMesh&&i.matrixWorld.determinantAffine()<0,s=St(e,t,n,r,i);B.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=Ee.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;qe.setup(i,r,s,n,c);let h,g=We;if(c!==null&&(h=Te.get(c),g=Ge,g.setIndex(h)),i.isMesh)r.wireframe===!0?(B.setLineWidth(r.wireframeLinewidth*ye()),g.setMode(z.LINES)):g.setMode(z.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),B.setLineWidth(e*ye()),i.isLineSegments?g.setMode(z.LINES):i.isLineLoop?g.setMode(z.LINE_LOOP):g.setMode(z.LINE_STRIP)}else i.isPoints?g.setMode(z.POINTS):i.isSprite&&g.setMode(z.TRIANGLES);if(i.isBatchedMesh){if(xe.get(`WEBGL_multi_draw`))g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else{let e=i._multiDrawStarts,t=i._multiDrawCounts,n=i._multiDrawCount,a=c?Te.get(c).bytesPerElement:1,o=V.get(r).currentProgram.getUniforms();for(let r=0;r<n;r++)o.setValue(z,`_gl_DrawID`,r),g.render(e[r]/a,t[r])}}else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function ot(e,t,n,r){D!==null&&e.isNodeMaterial&&D.setObject(r,e),fe===!0&&Pe.setState(e,n,!1),e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,vt(e,t,r),e.side=0,e.needsUpdate=!0,vt(e,t,r),e.side=2):vt(e,t,r)}this.compile=function(e,t,n=null){n===null&&(n=e),D!==null&&D.renderStart(e,t,n),x=Ne.get(n),x.init(t),C.push(x),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(x.pushLight(e),e.castShadow&&x.pushShadow(e))}),x.setupLights(),D!==null&&D.updateLights(x.state.lightsArray),pe=this.localClippingEnabled,fe=Pe.init(this.clippingPlanes,pe),fe===!0&&Pe.setGlobalState(this.clippingPlanes,t),D!==null&&Ie.render(x.state.shadowsArray,n,t);let r=new Set;return e.traverse(function(e){if(!(e.isMesh||e.isPoints||e.isLine||e.isSprite))return;let i=e.material;if(i){if(Array.isArray(i))for(let a=0;a<i.length;a++){let o=i[a];ot(o,n,t,e),r.add(o)}else ot(i,n,t,e),r.add(i)}}),x=C.pop(),D!==null&&D.renderEnd(),r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){r.forEach(function(e){let t=V.get(e).currentProgram;(t===void 0||t.isReady())&&r.delete(e)}),r.size===0?t(e):setTimeout(n,10)}xe.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let st=null;function ct(e){st&&st(e)}function lt(){dt.stop()}function ut(){dt.start()}let dt=new wo;dt.setAnimationLoop(ct),typeof self<`u`&&dt.setContext(self),this.setAnimationLoop=function(e){st=e,Xe.setAnimationLoop(e),e===null?dt.stop():dt.start()},Xe.addEventListener(`sessionstart`,lt),Xe.addEventListener(`sessionend`,ut),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){W(`WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(E===!0)return;D!==null&&D.renderStart(e,t);let n=Xe.enabled===!0&&Xe.isPresenting===!0,r=w!==null&&(N===null||n)&&w.begin(T,N);if(e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),Xe.enabled===!0&&Xe.isPresenting===!0&&(w===null||w.isCompositing()===!1)&&(Xe.cameraAutoUpdate===!0&&Xe.updateCamera(t),t=Xe.getCamera()),e.isScene===!0&&e.onBeforeRender(T,e,t,N),x=Ne.get(e,C.length),x.init(t),x.state.textureUnits=H.getTextureUnits(),C.push(x),me.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),t.isArrayCamera?de.setFromArrayCamera(t):ue.setFromProjectionMatrix(me,Zt,t.reversedDepth),pe=this.localClippingEnabled,fe=Pe.init(this.clippingPlanes,pe),b=Ae.get(e,S.length),b.init(),S.push(b),this.info.render.frame++,Xe.enabled===!0&&Xe.isPresenting===!0){let e=T.xr.getDepthSensingMesh();e!==null&&ft(e,t,-1/0,T.sortObjects)}ft(e,t,0,T.sortObjects),b.finish(),D!==null&&D.updateLights(x.state.lightsArray),T.sortObjects===!0&&b.sort(se,L),ve=Xe.enabled===!1||Xe.isPresenting===!1||Xe.hasDepthSensing()===!1,ve&&Re.addToRenderList(b,e),this.info.autoReset===!0&&this.info.reset(),fe===!0&&Pe.beginShadows();let i=x.state.shadowsArray;if(Ie.render(i,e,t),fe===!0&&Pe.endShadows(),(r&&w.hasRenderPass())===!1){let n=b.opaque,r=b.transmissive;if(x.setupLights(),t.isArrayCamera){let i=t.cameras;if(r.length>0)for(let t=0,a=i.length;t<a;t++){let a=i[t];mt(n,r,e,a)}ve&&Re.render(e);for(let t=0,n=i.length;t<n;t++){let n=i[t];pt(b,e,n,n.viewport)}}else r.length>0&&mt(n,r,e,t),ve&&Re.render(e),pt(b,e,t)}N!==null&&M===0&&(H.updateMultisampleRenderTarget(N),H.updateRenderTargetMipmap(N)),r&&w.end(T),e.isScene===!0&&e.onAfterRender(T,e,t),qe.resetDefaultState(),P=-1,ee=null,C.pop(),C.length>0?(x=C[C.length-1],H.setTextureUnits(x.state.textureUnits),fe===!0&&Pe.setGlobalState(T.clippingPlanes,x.state.camera)):x=null,S.pop(),b=S.length>0?S[S.length-1]:null,D!==null&&D.renderEnd()};function ft(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)x.pushLight(e),e.castShadow&&x.pushShadow(e);else if(e.isSprite){let i=t.isArrayCamera?de:ue;if(!e.frustumCulled||e.intersectsFrustum(i)){r&&ge.setFromMatrixPosition(e.matrixWorld).applyMatrix4(me);let i=De.update(e),a=e.material;a.visible&&b.push(e,i,a,n,ge.z,null,t)}}else if(e.isMesh||e.isLine||e.isPoints){let i=t.isArrayCamera?de:ue;if(!e.frustumCulled||e.intersectsFrustum(i)){let i=De.update(e),a=e.material;if(r&&(e.boundingSphere===void 0?(i.boundingSphere===null&&i.computeBoundingSphere(),ge.copy(i.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),ge.copy(e.boundingSphere.center)),ge.applyMatrix4(e.matrixWorld).applyMatrix4(me)),Array.isArray(a)){let r=i.groups;for(let o=0,s=r.length;o<s;o++){let s=r[o],c=a[s.materialIndex];c&&c.visible&&b.push(e,i,c,n,ge.z,s,t)}}else a.visible&&b.push(e,i,a,n,ge.z,null,t)}}}let i=e.children;for(let e=0,a=i.length;e<a;e++)ft(i[e],t,n,r)}function pt(e,t,n,r){let{opaque:i,transmissive:a,transparent:o}=e;x.setupLightsView(n),fe===!0&&Pe.setGlobalState(T.clippingPlanes,n),r&&B.viewport(F.copy(r)),i.length>0&&ht(i,t,n),a.length>0&&ht(a,t,n),o.length>0&&ht(o,t,n),B.buffers.depth.setTest(!0),B.buffers.depth.setMask(!0),B.buffers.color.setMask(!0),B.setPolygonOffset(!1)}function mt(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(x.state.transmissionRenderTarget[r.id]===void 0){let e=xe.has(`EXT_color_buffer_half_float`)||xe.has(`EXT_color_buffer_float`);x.state.transmissionRenderTarget[r.id]=new Bn(1,1,{generateMipmaps:!0,type:e?ze:Me,minFilter:je,samples:Math.max(4,Se.samples),stencilBuffer:i,resolveDepthBuffer:!1,resolveStencilBuffer:!1,storeMultisampledDepthBuffer:!1,storeMultisampledStencilBuffer:!1,colorSpace:J.workingColorSpace})}let a=x.state.transmissionRenderTarget[r.id],o=r.viewport||F;a.setSize(o.z*T.transmissionResolutionScale,o.w*T.transmissionResolutionScale);let s=T.getRenderTarget(),c=T.getActiveCubeFace(),l=T.getActiveMipmapLevel();T.setRenderTarget(a),T.getClearColor(re),ie=T.getClearAlpha(),ie<1&&T.setClearColor(16777215,.5),T.clear(),ve&&Re.render(n);let u=T.toneMapping;T.toneMapping=0;let d=r.viewport;if(r.viewport!==void 0&&(r.viewport=void 0),x.setupLightsView(r),fe===!0&&Pe.setGlobalState(T.clippingPlanes,r),ht(e,n,r),H.updateMultisampleRenderTarget(a),H.updateRenderTargetMipmap(a),xe.has(`WEBGL_multisampled_render_to_texture`)===!1){let e=!1;for(let i=0,a=t.length;i<a;i++){let{object:a,geometry:o,material:s,group:c}=t[i];if(s.side===2&&a.layers.test(r.layers)){let t=s.side;s.side=1,s.needsUpdate=!0,gt(a,n,r,o,s,c),s.side=t,s.needsUpdate=!0,e=!0}}e===!0&&(H.updateMultisampleRenderTarget(a),H.updateRenderTargetMipmap(a))}T.setRenderTarget(s,c,l),T.setClearColor(re,ie),d!==void 0&&(r.viewport=d),T.toneMapping=u}function ht(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],{object:o,geometry:s,group:c}=a,l=a.material;l.allowOverride===!0&&r!==null&&(l=r),o.layers.test(n.layers)&&gt(o,t,n,s,l,c)}}function gt(e,t,n,r,i,a){D!==null&&i.isNodeMaterial&&D.setObject(e,i),e.onBeforeRender(T,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(T,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,T.renderBufferDirect(n,t,r,i,e,a),i.side=2):T.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(T,t,n,r,i,a)}function _t(e){let t=0;for(let n of e)n.texture!==null&&t++;return t}function vt(e,t,n){t.isScene!==!0&&(t=_e);let r=V.get(e),i=x.state.lights,a=x.state.shadowsArray,o=i.state.version,s=Oe.getParameters(e,i.state,a,t,n,x.state.lightProbeGridArray),c=Oe.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial||e.isMeshLambertMaterial||e.isMeshPhongMaterial?t.environment:null,r.fog=t.fog;let u=e.isMeshStandardMaterial||e.isMeshLambertMaterial&&!e.envMap||e.isMeshPhongMaterial&&!e.envMap;r.envMap=we.get(e.envMap||r.environment,u),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,rt),l=new Map,r.programs=l,r.programVariants=new Map);let d=l.get(c);if(d!==void 0){if(r.currentProgram===d&&r.lightsStateVersion===o)return xt(e,s),d}else s.uniforms=Oe.getUniforms(e),D!==null&&e.isNodeMaterial&&D.build(e,n,s),e.onBeforeCompile(s,T),d=Oe.acquireProgram(s,c),l.set(c,d),r.uniforms=s.uniforms;let f=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(f.clippingPlanes=Pe.uniform),xt(e,s),r.needsLights=wt(e),r.lightsStateVersion=o,r.needsLights&&(f.ambientLightColor.value=i.state.ambient,f.lightProbe.value=i.state.probe,f.sunLights.value=i.state.sun,f.sunLightShadows.value=i.state.sunShadow,f.directionalLights.value=i.state.directional,f.directionalLightShadows.value=i.state.directionalShadow,f.spotLights.value=i.state.spot,f.spotLightShadows.value=i.state.spotShadow,f.rectAreaLights.value=i.state.rectArea,f.ltc_1.value=i.state.rectAreaLTC1,f.ltc_2.value=i.state.rectAreaLTC2,f.pointLights.value=i.state.point,f.pointLightShadows.value=i.state.pointShadow,f.hemisphereLights.value=i.state.hemi,f.sunShadowMatrix.value=i.state.sunShadowMatrix,f.sunShadowCascade.value=i.state.sunShadowCascade,f.directionalShadowMatrix.value=i.state.directionalShadowMatrix,f.spotLightMatrix.value=i.state.spotLightMatrix,f.spotLightMap.value=i.state.spotLightMap,f.pointShadowMatrix.value=i.state.pointShadowMatrix),r.numLightProbeGrids=_t(x.state.lightProbeGridArray),r.currentProgram=d,r.uniformsList=null,d}function yt(e,t,n,r,i){let a=V.get(e),o=a.currentProgram.id+`,`+r+`,`+i,s=a.programVariants.get(o);return s===void 0?(s=vt(e,t,n),a.programVariants.set(o,s)):(a.currentProgram=s,a.uniformsList=null,a.outputColorSpace=r,a.toneMapping=i),s}function bt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=hc.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function xt(e,t){let n=V.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.batchingColor=t.batchingColor,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function St(e,t,n,r,i){t.isScene!==!0&&(t=_e),H.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial?t.environment:null,s=N===null?T.outputColorSpace:N.isXRRenderTarget===!0?N.texture.colorSpace:J.workingColorSpace,c=r.isMeshStandardMaterial||r.isMeshLambertMaterial&&!r.envMap||r.isMeshPhongMaterial&&!r.envMap,l=we.get(r.envMap||o,c),u=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,d=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),f=!!n.morphAttributes.position,p=!!n.morphAttributes.normal,m=!!n.morphAttributes.color,h=0;r.toneMapped&&(N===null||N.isXRRenderTarget===!0)&&(h=T.toneMapping);let g=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,_=g===void 0?0:g.length,v=V.get(r),b=x.state.lights;if(fe===!0&&(pe===!0||e!==ee)){let t=e===ee&&r.id===P;Pe.setState(r,e,t)}let S=!1,C=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==b.state.version||i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isBatchedMesh&&v.batchingColor===!0&&i._colorsTexture===null||i.isBatchedMesh&&v.batchingColor===!1&&i._colorsTexture!==null||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?S=!0:v.envMap===l?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==Pe.numPlanes||v.numIntersection!==Pe.numIntersection)?S=!0:v.vertexAlphas===u&&v.vertexTangents===d&&v.morphTargets===f&&v.morphNormals===p&&v.morphColors===m&&v.morphTargetsCount===_&&v.numLightProbeGrids===_t(x.state.lightProbeGridArray)?(v.outputColorSpace!==s||v.toneMapping!==h)&&(C=!0):S=!0:S=!0:(S=!0,v.__version=r.version);let w=v.currentProgram;(S===!0||C===!0)&&(w=C===!0?yt(r,t,i,s,h):vt(r,t,i),D&&r.isNodeMaterial&&D.onUpdateProgram(r,w,v));let E=!1,O=!1,k=!1,A=w.getUniforms(),j=v.uniforms;if(B.useProgram(w.program)&&(E=!0,O=!0,k=!0),r.id!==P&&(P=r.id,O=!0),E||ee!==e){B.buffers.depth.getReversed()&&e.reversedDepth!==!0&&(e._reversedDepth=!0,e.updateProjectionMatrix()),A.setValue(z,`projectionMatrix`,e.projectionMatrix),A.setValue(z,`viewMatrix`,e.matrixWorldInverse);let t=A.map.cameraPosition;t!==void 0&&t.setValue(z,he.setFromMatrixPosition(e.matrixWorld)),Se.logarithmicDepthBuffer&&A.setValue(z,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&A.setValue(z,`isOrthographic`,e.isOrthographicCamera===!0),ee!==e&&(ee=e,O=!0,k=!0)}if(v.needsLights&&(b.state.sunShadowMap.length>0&&A.setValue(z,`sunShadowMap`,b.state.sunShadowMap,H),b.state.directionalShadowMap.length>0&&A.setValue(z,`directionalShadowMap`,b.state.directionalShadowMap,H),b.state.spotShadowMap.length>0&&A.setValue(z,`spotShadowMap`,b.state.spotShadowMap,H),b.state.pointShadowMap.length>0&&A.setValue(z,`pointShadowMap`,b.state.pointShadowMap,H)),i.isSkinnedMesh){A.setOptional(z,i,`bindMatrix`),A.setOptional(z,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),A.setValue(z,`boneTexture`,e.boneTexture,H))}i.isBatchedMesh&&(A.setOptional(z,i,`batchingTexture`),A.setValue(z,`batchingTexture`,i._matricesTexture,H),A.setOptional(z,i,`batchingIdTexture`),A.setValue(z,`batchingIdTexture`,i._indirectTexture,H),A.setOptional(z,i,`batchingColorTexture`),i._colorsTexture!==null&&A.setValue(z,`batchingColorTexture`,i._colorsTexture,H));let M=n.morphAttributes;if((M.position!==void 0||M.normal!==void 0||M.color!==void 0)&&Ue.update(i,n,w),(O||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,A.setValue(z,`receiveShadow`,i.receiveShadow)),(r.isMeshStandardMaterial||r.isMeshLambertMaterial||r.isMeshPhongMaterial)&&r.envMap===null&&t.environment!==null&&(j.envMapIntensity.value=t.environmentIntensity),j.dfgLUT!==void 0&&(j.dfgLUT.value=Ml()),O){if(A.setValue(z,`toneMappingExposure`,T.toneMappingExposure),v.needsLights&&Ct(j,k),a&&r.fog===!0&&ke.refreshFogUniforms(j,a),ke.refreshMaterialUniforms(j,r,oe,ae,x.state.transmissionRenderTarget[e.id]),v.needsLights&&v.numLightProbeGrids>0){let e=y,t=0;for(let n of x.state.lightProbeGridArray)n.texture!==null&&(e.textures[t]=n.texture,e.min[t]=n.boundingBox.min,e.max[t]=n.boundingBox.max,e.resolution[t]=n.resolution,t++);for(let n in e)e[n].length=t;j.probesSH.value=e.textures,j.probesMin.value=e.min,j.probesMax.value=e.max,j.probesResolution.value=e.resolution}hc.upload(z,bt(v),j,H)}if(r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(hc.upload(z,bt(v),j,H),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&A.setValue(z,`center`,i.center),A.setValue(z,`modelViewMatrix`,i.modelViewMatrix),A.setValue(z,`normalMatrix`,i.normalMatrix),A.setValue(z,`modelMatrix`,i.matrixWorld),r.uniformsGroups!==void 0){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];Je.update(n,w),Je.bind(n,w)}}return w}function Ct(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.sunLights.needsUpdate=t,e.sunLightShadows.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function wt(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return j},this.getActiveMipmapLevel=function(){return M},this.getRenderTarget=function(){return N},this.setRenderTargetTextures=function(e,t,n){let r=V.get(e);r.__autoAllocateDepthBuffer=e.resolveDepthBuffer===!1,r.__autoAllocateDepthBuffer===!1&&(r.__useRenderToTexture=!1),V.get(e.texture).__webglTexture=t,V.get(e.depthTexture).__webglTexture=r.__autoAllocateDepthBuffer?void 0:n,r.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(e,t){let n=V.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){N=e,j=t,M=n;let r=null,i=!1,a=!1;if(e){let o=V.get(e);if(o.__useDefaultFramebuffer!==void 0){B.bindFramebuffer(z.FRAMEBUFFER,o.__webglFramebuffer),F.copy(e.viewport),te.copy(e.scissor),ne=e.scissorTest,B.viewport(F),B.scissor(te),B.setScissorTest(ne),P=-1;return}if(o.__webglFramebuffer===void 0)H.setupRenderTarget(e);else if(o.__hasExternalTextures)H.rebindTextures(e,V.get(e.texture).__webglTexture,V.get(e.depthTexture).__webglTexture);else if(e.depthBuffer){let t=e.depthTexture;if(o.__boundDepthTexture!==t){if(t!==null&&V.has(t)&&(e.width!==t.image.width||e.height!==t.image.height))throw Error(`THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.`);H.setupDepthRenderbuffer(e)}}let s=e.texture;(s.isData3DTexture||s.isDataArrayTexture||s.isCompressedArrayTexture)&&(a=!0);let c=V.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(r=Array.isArray(c[t])?c[t][n]:c[t],i=!0):r=e.samples>0&&H.useMultisampledRTT(e)===!1?V.get(e).__webglMultisampledFramebuffer:Array.isArray(c)?c[n]:c,F.copy(e.viewport),te.copy(e.scissor),ne=e.scissorTest}else F.copy(ce).multiplyScalar(oe).floor(),te.copy(R).multiplyScalar(oe).floor(),ne=le;if(n!==0&&(r=O),B.bindFramebuffer(z.FRAMEBUFFER,r)&&B.drawBuffers(e,r),B.viewport(F),B.scissor(te),B.setScissorTest(ne),i){let r=V.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(a){let r=t;for(let t=0;t<e.textures.length;t++){let i=V.get(e.textures[t]);z.framebufferTextureLayer(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0+t,i.__webglTexture,n,r)}}else if(e!==null&&n!==0){let t=V.get(e.texture);z.framebufferTexture2D(z.FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,t.__webglTexture,n)}P=-1};function Tt(e){let t=V.get(e);return(t.__readFormat!==e.format||t.__readType!==e.type)&&(t.__readFormat=e.format,t.__readType=e.type,t.__formatReadable=Se.textureFormatReadable(e.format),t.__typeReadable=Se.textureTypeReadable(e.type)),t}this.readRenderTargetPixels=function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget)){W(`WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let c=V.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){B.bindFramebuffer(z.FRAMEBUFFER,c);try{let o=e.textures[s],c=o.format,l=o.type;e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s);let u=Tt(o);if(u.__formatReadable===!1){W(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}if(u.__typeReadable===!1){W(`WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&z.readPixels(t,n,r,i,Ke.convert(c),Ke.convert(l),a)}finally{let e=N===null?null:V.get(N).__webglFramebuffer;B.bindFramebuffer(z.FRAMEBUFFER,e)}}},this.readRenderTargetPixelsAsync=async function(e,t,n,r,i,a,o,s=0){if(!(e&&e.isWebGLRenderTarget))throw Error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);let c=V.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(c=c[o],Array.isArray(c)&&(c=c[0])),c){if(t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i){B.bindFramebuffer(z.FRAMEBUFFER,c);let o=e.textures[s],l=o.format,u=o.type;e.textures.length>1&&z.readBuffer(z.COLOR_ATTACHMENT0+s);let d=Tt(o);if(d.__formatReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.`);if(d.__typeReadable===!1)throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.`);let f=z.createBuffer();z.bindBuffer(z.PIXEL_PACK_BUFFER,f),z.bufferData(z.PIXEL_PACK_BUFFER,a.byteLength,z.STREAM_READ),z.readPixels(t,n,r,i,Ke.convert(l),Ke.convert(u),0),z.bindBuffer(z.PIXEL_PACK_BUFFER,null);let p=N===null?null:V.get(N).__webglFramebuffer;B.bindFramebuffer(z.FRAMEBUFFER,p);let m=z.fenceSync(z.SYNC_GPU_COMMANDS_COMPLETE,0);return z.flush(),await sn(z,m,4),z.bindBuffer(z.PIXEL_PACK_BUFFER,f),z.getBufferSubData(z.PIXEL_PACK_BUFFER,0,a),z.bindBuffer(z.PIXEL_PACK_BUFFER,null),z.deleteBuffer(f),z.deleteSync(m),a}throw Error(`THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.`)}},this.copyFramebufferToTexture=function(e,t=null,n=0){let r=2**-n,i=Math.floor(e.image.width*r),a=Math.floor(e.image.height*r),o=t===null?0:t.x,s=t===null?0:t.y;H.setTexture2D(e,0),z.copyTexSubImage2D(z.TEXTURE_2D,n,0,0,o,s,i,a),B.unbindTexture()},this.copyTextureToTexture=function(e,t,n=null,r=null,i=0,a=0){let o,s,c,l,u,d,f,p,m,h=e.isCompressedTexture?e.mipmaps[a]:e.image;if(n!==null)o=n.max.x-n.min.x,s=n.max.y-n.min.y,c=n.isBox3?n.max.z-n.min.z:1,l=n.min.x,u=n.min.y,d=n.isBox3?n.min.z:0;else{let t=2**-i;o=Math.floor(h.width*t),s=Math.floor(h.height*t),c=e.isDataArrayTexture?h.depth:e.isData3DTexture?Math.floor(h.depth*t):1,l=0,u=0,d=0}r===null?(f=0,p=0,m=0):(f=r.x,p=r.y,m=r.z);let g=Ke.convert(t.format),_=Ke.convert(t.type),v;t.isData3DTexture?(H.setTexture3D(t,0),v=z.TEXTURE_3D):t.isDataArrayTexture||t.isCompressedArrayTexture?(H.setTexture2DArray(t,0),v=z.TEXTURE_2D_ARRAY):(H.setTexture2D(t,0),v=z.TEXTURE_2D),B.activeTexture(z.TEXTURE0),B.pixelStorei(z.UNPACK_FLIP_Y_WEBGL,t.flipY),B.pixelStorei(z.UNPACK_PREMULTIPLY_ALPHA_WEBGL,t.premultiplyAlpha),B.pixelStorei(z.UNPACK_ALIGNMENT,t.unpackAlignment);let y=B.getParameter(z.UNPACK_ROW_LENGTH),b=B.getParameter(z.UNPACK_IMAGE_HEIGHT),x=B.getParameter(z.UNPACK_SKIP_PIXELS),S=B.getParameter(z.UNPACK_SKIP_ROWS),C=B.getParameter(z.UNPACK_SKIP_IMAGES);B.pixelStorei(z.UNPACK_ROW_LENGTH,h.width),B.pixelStorei(z.UNPACK_IMAGE_HEIGHT,h.height),B.pixelStorei(z.UNPACK_SKIP_PIXELS,l),B.pixelStorei(z.UNPACK_SKIP_ROWS,u),B.pixelStorei(z.UNPACK_SKIP_IMAGES,d);let w=e.isDataArrayTexture||e.isData3DTexture,T=t.isDataArrayTexture||t.isData3DTexture;if(e.isDepthTexture){let n=V.get(e),r=V.get(t),h=V.get(n.__renderTarget),g=V.get(r.__renderTarget);B.bindFramebuffer(z.READ_FRAMEBUFFER,h.__webglFramebuffer),B.bindFramebuffer(z.DRAW_FRAMEBUFFER,g.__webglFramebuffer);for(let n=0;n<c;n++)w&&(z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,V.get(e).__webglTexture,i,d+n),z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,V.get(t).__webglTexture,a,m+n)),z.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,z.DEPTH_BUFFER_BIT,z.NEAREST);B.bindFramebuffer(z.READ_FRAMEBUFFER,null),B.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else if(i!==0||e.isRenderTargetTexture||V.has(e)){let n=V.get(e),r=V.get(t);B.bindFramebuffer(z.READ_FRAMEBUFFER,k),B.bindFramebuffer(z.DRAW_FRAMEBUFFER,A);for(let e=0;e<c;e++)w?z.framebufferTextureLayer(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,n.__webglTexture,i,d+e):z.framebufferTexture2D(z.READ_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,n.__webglTexture,i),T?z.framebufferTextureLayer(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,r.__webglTexture,a,m+e):z.framebufferTexture2D(z.DRAW_FRAMEBUFFER,z.COLOR_ATTACHMENT0,z.TEXTURE_2D,r.__webglTexture,a),i===0?T?z.copyTexSubImage3D(v,a,f,p,m+e,l,u,o,s):z.copyTexSubImage2D(v,a,f,p,l,u,o,s):z.blitFramebuffer(l,u,l+o,u+s,f,p,f+o,p+s,z.COLOR_BUFFER_BIT,z.NEAREST);B.bindFramebuffer(z.READ_FRAMEBUFFER,null),B.bindFramebuffer(z.DRAW_FRAMEBUFFER,null)}else T?e.isDataTexture||e.isData3DTexture?z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h.data):t.isCompressedArrayTexture?z.compressedTexSubImage3D(v,a,f,p,m,o,s,c,g,h.data):z.texSubImage3D(v,a,f,p,m,o,s,c,g,_,h):e.isDataTexture?z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h.data):e.isCompressedTexture?z.compressedTexSubImage2D(z.TEXTURE_2D,a,f,p,h.width,h.height,g,h.data):z.texSubImage2D(z.TEXTURE_2D,a,f,p,o,s,g,_,h);B.pixelStorei(z.UNPACK_ROW_LENGTH,y),B.pixelStorei(z.UNPACK_IMAGE_HEIGHT,b),B.pixelStorei(z.UNPACK_SKIP_PIXELS,x),B.pixelStorei(z.UNPACK_SKIP_ROWS,S),B.pixelStorei(z.UNPACK_SKIP_IMAGES,C),a===0&&t.generateMipmaps===!0&&t.mipmapsAutoUpdate===!0&&z.generateMipmap(v),B.unbindTexture()},this.initRenderTarget=function(e){V.get(e).__webglFramebuffer===void 0&&H.setupRenderTarget(e)},this.initTexture=function(e){e.isCubeTexture?H.setTextureCube(e,0):e.isData3DTexture?H.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?H.setTexture2DArray(e,0):H.setTexture2D(e,0),B.unbindTexture()},this.resetState=function(){j=0,M=0,N=null,B.reset(),qe.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return Zt}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=J._getDrawingBufferColorSpace(e),t.unpackColorSpace=J._getUnpackColorSpace()}};function Pl(e){return e===`copy`?`copy`:e===`eraser`?`eraser`:`normal`}var Fl={r:!1,g:!1,b:!1,a:!1};function Il(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function Ll(e){return Il(e)?{r:e.r===!0,g:e.g===!0,b:e.b===!0,a:e.a===!0}:{...Fl}}function Rl(e){return e.r!==!0&&e.g!==!0&&e.b!==!0&&e.a!==!0}function zl(e,t,n,r,i){let a=n.a/255*r;if(!(a>0))return!1;let o=e[t+3]/255,s=a+o*(1-a);if(!(s>0))return!1;let c=o*(1-a),l=Math.round((n.r*a+e[t]*c)/s),u=Math.round((n.g*a+e[t+1]*c)/s),d=Math.round((n.b*a+e[t+2]*c)/s),f=Math.round(s*255);return i===void 0||Rl(i)?(e[t]=l,e[t+1]=u,e[t+2]=d,e[t+3]=f,!0):(i.r!==!0&&(e[t]=l),i.g!==!0&&(e[t+1]=u),i.b!==!0&&(e[t+2]=d),i.a!==!0&&(e[t+3]=f),!0)}function Bl(e,t){return new Uint8ClampedArray(e*t*4)}var Vl=1024;function Hl(e){return Number.isFinite(e)?Math.min(Vl,Math.max(1,Math.floor(e))):1}function Ul(e,t,n,r,i){let a=new Uint8ClampedArray(r*i*4),o=Math.min(t,r),s=Math.min(n,i);for(let n=0;n<s;n+=1){let i=n*t*4,s=n*r*4;a.set(e.subarray(i,i+o*4),s)}return a}function Wl(e,t,n,r){if(!Number.isFinite(t)||!Number.isFinite(n)||t<1||n<1||e.length<t*n*4)return null;let i=Math.min(254,Math.max(0,Math.floor(r))),a=t,o=n,s=-1,c=-1;for(let r=0;r<n;r+=1){let n=r*t*4;for(let l=0;l<t;l+=1)e[n+l*4+3]>i&&(l<a&&(a=l),l>s&&(s=l),r<o&&(o=r),r>c&&(c=r))}return s<0?null:{left:a,top:o,width:s-a+1,height:c-o+1}}function Gl(e,t=void 0){if(t===void 0||Rl(t))e.fill(0);else for(let n=0;n<e.length;n+=4)t.r!==!0&&(e[n]=0),t.g!==!0&&(e[n+1]=0),t.b!==!0&&(e[n+2]=0),t.a!==!0&&(e[n+3]=0)}function Kl(e,t,n,r,i,a,o=void 0,s=`normal`){if(r<0||i<0||r>=t||i>=n)return!1;let c=(i*t+r)*4;return s===`eraser`?(o?.a!==!0&&(e[c+3]=Math.max(0,Math.round(e[c+3]-a.a))),!0):s===`copy`?o===void 0||Rl(o)?(e[c]=a.r,e[c+1]=a.g,e[c+2]=a.b,e[c+3]=a.a,!0):(o.r!==!0&&(e[c]=a.r),o.g!==!0&&(e[c+1]=a.g),o.b!==!0&&(e[c+2]=a.b),o.a!==!0&&(e[c+3]=a.a),!0):(zl(e,c,a,1,o),!0)}function ql(e,t,n,r,i){if(r<0||i<0||r>=t||i>=n)return null;let a=(i*t+r)*4;return{r:e[a],g:e[a+1],b:e[a+2],a:e[a+3]}}function Jl(e,t,n,r,i,a,o,s,c=void 0,l=`normal`){let u=r,d=i,f=Math.abs(a-r),p=Math.abs(o-i),m=r<a?1:-1,h=i<o?1:-1,g=f-p;for(;Kl(e,t,n,u,d,s,c,l),u!==a||d!==o;){let e=2*g;e>-p&&(g-=p,u+=m),e<f&&(g+=f,d+=h)}}function Yl(e,t,n,r,i,a,o=void 0,s=`normal`){if(!Number.isInteger(r)||!Number.isInteger(i)||r<0||i<0||r>=t||i>=n||t<1||n<1)return 0;let c=(i*t+r)*4,l=e[c],u=e[c+1],d=e[c+2],f=e[c+3];if(s===`copy`&&l===a.r&&u===a.g&&d===a.b&&f===a.a)return 0;let p=new Uint8Array(t*n),m=[i*t+r];p[i*t+r]=1;let h=0;for(;m.length>0;){let r=m.pop();if(r===void 0)break;let i=r%t,c=Math.floor(r/t),g=r*4;if(e[g]===l&&e[g+1]===u&&e[g+2]===d&&e[g+3]===f){if(Kl(e,t,n,i,c,a,o,s),h+=1,i>0){let e=r-1;p[e]!==1&&(p[e]=1,m.push(e))}if(i+1<t){let e=r+1;p[e]!==1&&(p[e]=1,m.push(e))}if(c>0){let e=r-t;p[e]!==1&&(p[e]=1,m.push(e))}if(c+1<n){let e=r+t;p[e]!==1&&(p[e]=1,m.push(e))}}}return h}var Xl=.1;function Zl(e){return Number.isFinite(e)?Math.min(64,Math.max(1,Math.floor(e))):1}function Ql(e){return Number.isFinite(e)?Math.min(64,Math.max(Xl,e)):1}function $l(e){return Number.isFinite(e)?Math.min(64,Math.max(1,Math.round(e))):1}function eu(e){return e===`circle`?`circle`:`square`}function tu(e,t,n,r,i,a,o,s,c=void 0,l=`normal`){let u=Zl(a),d=Math.floor((u-1)/2),f=r-d,p=i-d;if(o===`square`){for(let r=0;r<u;r+=1)for(let i=0;i<u;i+=1)Kl(e,t,n,f+i,p+r,s,c,l);return}let m=(u-1)/2,h=Math.max(0,u*u/4-.5);for(let r=0;r<u;r+=1)for(let i=0;i<u;i+=1)(i-m)*(i-m)+(r-m)*(r-m)<=h+1e-9&&Kl(e,t,n,f+i,p+r,s,c,l)}function nu(e,t,n,r,i,a,o,s,c,l,u=void 0,d=`normal`){let f=Zl(s);if(f<=1){Jl(e,t,n,r,i,a,o,l,u,d);return}let p=r,m=i,h=Math.abs(a-r),g=Math.abs(o-i),_=r<a?1:-1,v=i<o?1:-1,y=h-g;for(;tu(e,t,n,p,m,f,c,l,u,d),p!==a||m!==o;){let e=2*y;e>-g&&(y-=g,p+=_),e<h&&(y+=h,m+=v)}}function ru(e,t,n,r,i,a,o,s=void 0,c=`normal`){if(!(o>0)||r<0||i<0||r>=t||i>=n)return;let l=Math.min(1,Math.max(0,o));if(c===`eraser`){if(s?.a!==!0){let n=(i*t+r)*4;e[n+3]=Math.max(0,Math.round(e[n+3]-a.a*l))}}else if(c===`copy`){if(l>=1){Kl(e,t,n,r,i,a,s,c);return}let o=(i*t+r)*4,u=1-l;if(s===void 0||Rl(s)){e[o]=Math.round(e[o]*u+a.r*l),e[o+1]=Math.round(e[o+1]*u+a.g*l),e[o+2]=Math.round(e[o+2]*u+a.b*l),e[o+3]=Math.round(e[o+3]*u+a.a*l);return}s.r!==!0&&(e[o]=Math.round(e[o]*u+a.r*l)),s.g!==!0&&(e[o+1]=Math.round(e[o+1]*u+a.g*l)),s.b!==!0&&(e[o+2]=Math.round(e[o+2]*u+a.b*l)),s.a!==!0&&(e[o+3]=Math.round(e[o+3]*u+a.a*l))}else zl(e,(i*t+r)*4,a,l,s)}function iu(e,t,n,r,i,a,o,s,c,l,u,d=void 0,f=`normal`){let p=l?Ql(s):$l(s);if(!l){p<=1?Jl(e,t,n,r,i,a,o,u,d,f):nu(e,t,n,r,i,a,o,p,c,u,d,f);return}let m=p/2,h=a-r,g=o-i;if(!(Math.sqrt(h*h+g*g)>1e-9)){let a=m+.5,o=Math.floor(r-a),s=Math.ceil(r+a),l=Math.floor(i-a),p=Math.ceil(i+a);for(let a=l;a<=p;a+=1)for(let l=o;l<=s;l+=1)ru(e,t,n,l,a,u,ou(l,a,r,i,m,c),d,f);return}let _=m+1,v=Math.max(0,Math.floor(Math.min(r,a)-_)),y=Math.min(t-1,Math.ceil(Math.max(r,a)+_)),b=Math.max(0,Math.floor(Math.min(i,o)-_)),x=Math.min(n-1,Math.ceil(Math.max(i,o)+_));for(let s=b;s<=x;s+=1)for(let l=v;l<=y;l+=1)ru(e,t,n,l,s,u,su(l,s,r,i,a,o,m,c),d,f)}function au(e,t,n,r,i,a,o,s,c,l,u,d=void 0,f=`normal`){let p=(e,t)=>Math.sqrt((e.x-t.x)*(e.x-t.x)+(e.y-t.y)*(e.y-t.y)),m=p(r,i)+p(i,a)+p(a,o);if(!(m>1e-9)){iu(e,t,n,r.x,r.y,r.x,r.y,s,c,l,u,d,f);return}let h=Math.min(200,Math.max(16,Math.ceil(m*2))),g=r.x,_=r.y;for(let p=1;p<=h;p+=1){let m=p/h,v=1-m,y=v*v*v*r.x+3*v*v*m*i.x+3*v*m*m*a.x+m*m*m*o.x,b=v*v*v*r.y+3*v*v*m*i.y+3*v*m*m*a.y+m*m*m*o.y;iu(e,t,n,l?g:Math.round(g),l?_:Math.round(_),l?y:Math.round(y),l?b:Math.round(b),s,c,l,u,d,f),g=y,_=b}}function ou(e,t,n,r,i,a){if(a===`square`){let a=Math.min(1,Math.max(0,i+.5-Math.abs(e-n))),o=Math.min(1,Math.max(0,i+.5-Math.abs(t-r)));return Math.min(a,o)}let o=Math.sqrt((e-n)*(e-n)+(t-r)*(t-r));return i+.5-o}function su(e,t,n,r,i,a,o,s){let c=i-n,l=a-r,u=Math.sqrt(c*c+l*l);if(!(u>1e-9))return ou(e,t,n,r,o,s);let d=c/u,f=l/u,p=e-n,m=t-r,h=p*d+m*f,g=Math.abs(p*f-m*d);if(s===`circle`){let i=Math.min(u,Math.max(0,h)),a=n+d*i,s=r+f*i,c=Math.sqrt((e-a)*(e-a)+(t-s)*(t-s));return o+.5-c}let _=o+.5-g;if(_<=0)return _;let v=1;return h<0?v=1+h:h>u&&(v=1-(h-u)),v<=0?v:_<v?_:v}function cu(e,t,n,r,i,a,o){let s=Math.floor((a-1)/2),c=Math.round(r)-s,l=Math.round(i)-s;if(o===`square`){for(let r=0;r<a;r+=1){let i=l+r;if(!(i<0||i>=n))for(let n=0;n<a;n+=1){let r=c+n;r<0||r>=t||(e[i*t+r]=255)}}return}let u=(a-1)/2,d=Math.max(0,a*a/4-.5);for(let r=0;r<a;r+=1){let i=l+r;if(!(i<0||i>=n)){for(let n=0;n<a;n+=1)if((n-u)*(n-u)+(r-u)*(r-u)<=d+1e-9){let r=c+n;if(r<0||r>=t)continue;e[i*t+r]=255}}}}function lu(e,t,n,r,i,a,o,s,c,l){if(e.length!==t*n)return;if(!l){let l=$l(s),u=Math.round(r),d=Math.round(i),f=Math.round(a),p=Math.round(o);if(l<=1){let r=Math.abs(f-u),i=Math.abs(p-d),a=u<f?1:-1,o=d<p?1:-1,s=r-i;for(;u>=0&&d>=0&&u<t&&d<n&&(e[d*t+u]=255),u!==f||d!==p;){let e=2*s;e>-i&&(s-=i,u+=a),e<r&&(s+=r,d+=o)}return}let m=Math.abs(f-u),h=Math.abs(p-d),g=u<f?1:-1,_=d<p?1:-1,v=m-h;for(;cu(e,t,n,u,d,l,c),u!==f||d!==p;){let e=2*v;e>-h&&(v-=h,u+=g),e<m&&(v+=m,d+=_)}return}let u=Ql(s)/2,d=u+1,f=Math.max(0,Math.floor(Math.min(r,a)-d)),p=Math.min(t-1,Math.ceil(Math.max(r,a)+d)),m=Math.max(0,Math.floor(Math.min(i,o)-d)),h=Math.min(n-1,Math.ceil(Math.max(i,o)+d));for(let n=m;n<=h;n+=1)for(let s=f;s<=p;s+=1){let l=su(s,n,r,i,a,o,u,c);if(l>0){let r=n*t+s,i=Math.min(255,Math.round(l*255));i>e[r]&&(e[r]=i)}}}function uu(e,t,n,r,i,a,o,s,c,l){let u=(e,t)=>Math.sqrt((e.x-t.x)*(e.x-t.x)+(e.y-t.y)*(e.y-t.y)),d=u(r,i)+u(i,a)+u(a,o);if(!(d>1e-9)){lu(e,t,n,r.x,r.y,r.x,r.y,s,c,l);return}let f=Math.min(200,Math.max(16,Math.ceil(d*2))),p=r.x,m=r.y;for(let u=1;u<=f;u+=1){let d=u/f,h=1-d,g=h*h*h*r.x+3*h*h*d*i.x+3*h*d*d*a.x+d*d*d*o.x,_=h*h*h*r.y+3*h*h*d*i.y+3*h*d*d*a.y+d*d*d*o.y;lu(e,t,n,p,m,g,_,s,c,l),p=g,m=_}}function du(e,t,n,r,i,a,o=void 0){if(t.length===n*r&&e.length===n*r*4)for(let s=0;s<r;s+=1)for(let c=0;c<n;c+=1){let l=t[s*n+c];l===void 0||l<=0||ru(e,n,r,c,s,i,l/255,o,a)}}function fu(e,t,n,r,i,a=void 0){let o=n[r+3]/255*i;if(o<=0)return;let s=e[t+3]/255,c=o+s*(1-o),l=s*(1-o);if(a===void 0||Rl(a)){e[t]=Math.round((n[r]*o+e[t]*l)/c),e[t+1]=Math.round((n[r+1]*o+e[t+1]*l)/c),e[t+2]=Math.round((n[r+2]*o+e[t+2]*l)/c),e[t+3]=Math.round(c*255);return}let u=Math.round((n[r]*o+e[t]*l)/c),d=Math.round((n[r+1]*o+e[t+1]*l)/c),f=Math.round((n[r+2]*o+e[t+2]*l)/c),p=Math.round(c*255);a.r!==!0&&(e[t]=u),a.g!==!0&&(e[t+1]=d),a.b!==!0&&(e[t+2]=f),a.a!==!0&&(e[t+3]=p)}function pu(e){let t=e.trim().toLowerCase(),n=/^#([0-9a-f]{3})$/.exec(t);if(n!==null){let e=n[1];return{r:Number.parseInt(e[0]+e[0],16),g:Number.parseInt(e[1]+e[1],16),b:Number.parseInt(e[2]+e[2],16),a:255}}let r=/^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(t);if(r!==null){let e=r[1],t=r[2];return e===void 0?null:{r:Number.parseInt(e.slice(0,2),16),g:Number.parseInt(e.slice(2,4),16),b:Number.parseInt(e.slice(4,6),16),a:t===void 0?255:Number.parseInt(t,16)}}return null}function mu(e,t){return`${e},${t}`}function hu(e,t,n){let r=0;for(let i=-1;i<=1;i+=1)for(let a=-1;a<=1;a+=1)(a!==0||i!==0)&&e.has(mu(t+a,n+i))&&(r+=1);return r}function gu(e,t,n,r,i){let a=e,o=t,s=Math.abs(n-e),c=Math.abs(r-t),l=e<n?1:-1,u=t<r?1:-1,d=s-c;for(;i(a,o),a!==n||o!==r;){let e=2*d;e>-c&&(d-=c,a+=l),e<s&&(d+=s,o+=u)}}function _u(e,t){let{p0:n,c1:r,c2:i,p3:a}=e,o=(e,t)=>Math.sqrt((e.x-t.x)*(e.x-t.x)+(e.y-t.y)*(e.y-t.y)),s=o(n,r)+o(r,i)+o(i,a);if(!(s>1e-9)){gu(Math.round(n.x),Math.round(n.y),Math.round(n.x),Math.round(n.y),t);return}let c=Math.min(200,Math.max(16,Math.ceil(s*2))),l=n.x,u=n.y;for(let e=1;e<=c;e+=1){let o=e/c,s=1-o,d=s*s*s*n.x+3*s*s*o*r.x+3*s*o*o*i.x+o*o*o*a.x,f=s*s*s*n.y+3*s*s*o*r.y+3*s*o*o*i.y+o*o*o*a.y;gu(Math.round(l),Math.round(u),Math.round(d),Math.round(f),t),l=d,u=f}}var vu=class{recentWindow;painted=new Set;order=[];coords=new Map;pendingRemoved=[];constructor(e=4){this.recentWindow=e}reset(){this.painted.clear(),this.order.length=0,this.coords.clear(),this.pendingRemoved=[]}get size(){return this.painted.size}has(e,t){return this.painted.has(mu(e,t))}pixels(){let e=[];for(let[t,n]of this.coords)this.painted.has(t)&&e.push({x:n.x,y:n.y});return e}drainRemoved(){let e=this.pendingRemoved;return this.pendingRemoved=[],e}record(e,t,n){this.painted.add(e),this.coords.set(e,{x:t,y:n}),this.order.push(e)}occurrences(e){let t=0;for(let n of this.order)n===e&&(t+=1);return t}isOld(e){let t=this.order.lastIndexOf(e);return t!==-1&&t<this.order.length-this.recentWindow}touchesOld(e,t){for(let n=-1;n<=1;n+=1)for(let r=-1;r<=1;r+=1)if((r!==0||n!==0)&&this.isOld(mu(e+r,t+n)))return!0;return!1}neighborCodes(e,t){let n=[];for(let r=-1;r<=1;r+=1)for(let i=-1;i<=1;i+=1){if(i===0&&r===0)continue;let a=mu(e+i,t+r);this.painted.has(a)&&n.push(a)}return n}neighborCount(e){let t=this.coords.get(e);return t===void 0?0:hu(this.painted,t.x,t.y)}eat(e){let t=this.coords.get(e);if(t===void 0||!this.painted.has(e)||this.occurrences(e)!==1)return null;this.painted.delete(e);let n=this.order.lastIndexOf(e);return n!==-1&&(this.order[n]=null),this.coords.delete(e),{x:t.x,y:t.y}}add(e,t){let n=mu(e,t);if(this.order[this.order.length-1]===n)return!0;if(this.painted.has(n))return this.record(n,e,t),!0;let r=[];for(let i=0;i<2;i+=1){let a=this.neighborCodes(e,t);if(a.length===0)return this.record(n,e,t),this.pendingRemoved.push(...r),!0;let o=a.length>2,s=!1;for(let e of a)if(this.neighborCount(e)+1>2){s=!0;break}if(!o&&!s||this.touchesOld(e,t))return this.record(n,e,t),this.pendingRemoved.push(...r),!0;let c=!1;for(let e of a){let t=this.coords.get(e);if(t!==void 0&&this.touchesOld(t.x,t.y)){c=!0;break}}if(c)return this.record(n,e,t),this.pendingRemoved.push(...r),!0;if(o||i>0)break;let l=null,u=-1;for(let e of a){let t=this.order.lastIndexOf(e);t>u&&(u=t,l=e)}let d=l===null?null:this.eat(l);if(d===null)break;r.push(d)}for(let e of r)this.record(mu(e.x,e.y),e.x,e.y);return!1}},yu={x:0,y:0,rotation:0,flipX:!1,flipY:!1,scaleX:1,scaleY:1,skewX:0,skewY:0,rotationX:0,rotationY:0};function bu(e){let t=Math.cos(e.rotationX),n=Math.sin(e.rotationX),r=Math.cos(e.rotationY),i=Math.sin(e.rotationY),a=Math.cos(e.rotation),o=Math.sin(e.rotation),s=[[r,i*n,-i*t],[0,t,n],[i,-r*n,r*t]];return[[a*s[0][0]-o*s[1][0],a*s[0][1]-o*s[1][1],a*s[0][2]-o*s[1][2]],[o*s[0][0]+a*s[1][0],o*s[0][1]+a*s[1][1],o*s[0][2]+a*s[1][2]],[s[2][0],s[2][1],s[2][2]]]}function xu(e){return{a:e.scaleX,b:e.skewX*e.scaleY,c:e.skewY*e.scaleX,d:e.scaleY}}function Su(e){let t=bu(e),n=xu(e);return{a:t[0][0]*n.a+t[0][1]*n.c,b:t[0][0]*n.b+t[0][1]*n.d,c:t[1][0]*n.a+t[1][1]*n.c,d:t[1][0]*n.b+t[1][1]*n.d}}function Cu(e,t,n,r,i){let a=(e-n/2)*(i.flipX?-1:1),o=(t-r/2)*(i.flipY?-1:1),s=Su(i);return{x:s.a*a+s.b*o+i.x,y:s.c*a+s.d*o+i.y}}function wu(e,t,n,r,i){return Cu(e+.5,t+.5,n,r,i)}function Tu(e,t,n,r,i){let a=Eu(e,t,n,r,i);if(a===null)return null;let o=Math.floor(a.x),s=Math.floor(a.y);return o<0||s<0||o>=n||s>=r?null:{x:o,y:s}}function Eu(e,t,n,r,i){let a=Su(i),o=a.a*a.d-a.b*a.c;if(!(Math.abs(o)>1e-9))return null;let s=e-i.x,c=t-i.y,l=(a.d*s-a.b*c)/o,u=(-a.c*s+a.a*c)/o;return{x:l/(i.flipX?-1:1)+n/2,y:u/(i.flipY?-1:1)+r/2}}function Du(e,t,n,r){if(r.zoom<=0||n.width<=0||n.height<=0)return null;let i=n.left+n.width/2+r.panX,a=n.top+n.height/2+r.panY,o=e-i,s=t-a,c=Math.cos(r.rotation),l=Math.sin(r.rotation);return{x:(c*o+l*s)/r.zoom/(r.flipX?-1:1),y:(-l*o+c*s)/r.zoom/(r.flipY?-1:1)}}function Ou(e,t,n,r){let i=n.left+n.width/2+r.panX,a=n.top+n.height/2+r.panY,o=e*(r.flipX?-1:1)*r.zoom,s=t*(r.flipY?-1:1)*r.zoom,c=Math.cos(r.rotation),l=Math.sin(r.rotation);return{x:i+c*o-l*s,y:a+l*o+c*s}}function ku(e,t,n,r,i,a,o){let s=Du(e,t,n,a);return s===null?null:Tu(s.x,s.y,r,i,o)}function Au(e){return Number.isNaN(e)?1:Math.min(64,Math.max(.5,e))}function ju(e){let t=Math.PI*2,n=e%t;return n<=-Math.PI?n+=t:n>Math.PI&&(n-=t),n}function Mu(e,t,n,r,i){let a=1/0,o=1/0,s=-1/0,c=-1/0,l=[[-e/2,-t/2],[e/2,-t/2],[e/2,t/2],[-e/2,t/2]];for(let[e,t]of l){let l=Eu(e,t,n,r,i);if(l===null)return null;a=Math.min(a,l.x),o=Math.min(o,l.y),s=Math.max(s,l.x),c=Math.max(c,l.y)}let u=Math.max(0,Math.floor(a)),d=Math.max(0,Math.floor(o)),f=Math.min(n,Math.ceil(s)),p=Math.min(r,Math.ceil(c));return u>=f||d>=p?null:{left:u,top:d,width:f-u,height:p-d}}function Nu(e,t,n){let r=Math.abs(Math.cos(n)),i=Math.abs(Math.sin(n));return{width:e*r+t*i,height:e*i+t*r}}function Pu(e){let t=Math.cos(e.rotationX),n=Math.sin(e.rotationX),r=Math.cos(e.rotationY),i=Math.sin(e.rotationY),a=Math.cos(e.rotation),o=Math.sin(e.rotation),s=a*r,c=a*i*n-o*t,l=o*r,u=o*i*n+a*t;return{a:s*e.scaleX+c*e.skewY*e.scaleX,b:s*e.skewX*e.scaleY+c*e.scaleY,c:l*e.scaleX+u*e.skewY*e.scaleX,d:l*e.skewX*e.scaleY+u*e.scaleY}}function Fu(e){return bu(e)}function Iu(e){return Math.cos(e.rotationX)*Math.cos(e.rotationY)*e.scaleX*e.scaleY*(1-e.skewX*e.skewY)}function Lu(e){return!(Math.abs(Iu(e))>1e-9)}function Ru(e,t,n){let r=Pu(e),i=(t-e.width/2)*(e.flipX?-1:1),a=(n-e.height/2)*(e.flipY?-1:1);return{x:r.a*i+r.b*a+e.cx,y:r.c*i+r.d*a+e.cy}}function zu(e,t,n){let r=Pu(e),i=r.a*r.d-r.b*r.c;if(!(Math.abs(i)>1e-9))return null;let a=t-e.cx,o=n-e.cy,s=(r.d*a-r.b*o)/i,c=(-r.c*a+r.a*o)/i;return{x:s/(e.flipX?-1:1)+e.width/2,y:c/(e.flipY?-1:1)+e.height/2}}function Bu(e){let t=[Ru(e,0,0),Ru(e,e.width,0),Ru(e,e.width,e.height),Ru(e,0,e.height)],n=1/0,r=1/0,i=-1/0,a=-1/0;for(let e of t)n=Math.min(n,e.x),r=Math.min(r,e.y),i=Math.max(i,e.x),a=Math.max(a,e.y);return{minX:n,minY:r,maxX:i,maxY:a}}var Vu=`none`;function Hu(e){if(e===`rope`||e===`follow`||e===`none`)return e;if(typeof e==`string`){let t=e.trim().toLowerCase();if(t===`rope`||t===`follow`||t===`none`)return t}return Vu}function Uu(e){return Number.isFinite(e)?Math.min(200,Math.max(1,e)):20}function Wu(e){return Number.isFinite(e)?Math.min(100,Math.max(1,e)):20}function Gu(e,t){let n=t.x-e.x,r=t.y-e.y;return Math.sqrt(n*n+r*r)}function Ku(e,t,n){let r=Uu(n),i=t.x-e.x,a=t.y-e.y,o=Math.sqrt(i*i+a*a);if(!(o>0)||o<=r)return{x:e.x,y:e.y};let s=1-r/o;return{x:e.x+i*s,y:e.y+a*s}}function qu(e,t,n){let r=Wu(n)/100,i=t.x-e.x,a=t.y-e.y;return Math.abs(i)>1e-12||Math.abs(a)>1e-12?{x:e.x+i*r,y:e.y+a*r}:{x:e.x,y:e.y}}var Ju={mode:`image`,sizeX:16,sizeY:16,colorA:`#c7c7c7`,colorB:`#949494`},Yu=`gnumarus.settings.checker.v1`,Xu=class extends Error{constructor(e){super(e),this.name=`GnumarusSettingsError`}};function Zu(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function Qu(e){return typeof e==`string`&&/^#[0-9a-fA-F]{6}$/.test(e)}function $u(e){return Number.isNaN(e)?Ju.sizeX:Math.min(128,Math.max(1,Math.floor(e)))}function ed(e){let t;try{t=JSON.parse(e)}catch{throw new Xu(`checker settings are not valid JSON`)}if(!Zu(t))throw new Xu(`checker settings root must be an object`);let{mode:n,size:r,sizeX:i,sizeY:a,colorA:o,colorB:s}=t;if(n!==`image`&&n!==`screen`)throw new Xu(`checker settings have an invalid mode`);let c=typeof i==`number`?i:typeof r==`number`?r:null,l=typeof a==`number`?a:typeof r==`number`?r:null;if(c===null||l===null||!Qu(o)||!Qu(s))throw new Xu(`checker settings have invalid fields`);return{mode:n,sizeX:$u(c),sizeY:$u(l),colorA:o,colorB:s}}function td(e){return JSON.stringify(e,null,2)}var nd={minZoom:10},rd=`gnumarus.settings.grid.v1`,id=class extends Error{constructor(e){super(e),this.name=`GnumarusGridSettingsError`}};function ad(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function od(e){return Number.isFinite(e)?Math.min(64,Math.max(2,e)):nd.minZoom}function sd(e){let t;try{t=JSON.parse(e)}catch{throw new id(`grid settings are not valid JSON`)}if(!ad(t))throw new id(`grid settings root must be an object`);let{minZoom:n,minZoomPercent:r}=t,i=null;if(typeof n==`number`?i=n:typeof r==`number`&&(i=r/100),i===null)throw new id(`grid settings have invalid fields`);return{minZoom:od(i)}}function cd(e){return JSON.stringify({minZoom:od(e.minZoom)},null,2)}function ld(e,t){return!Number.isFinite(e)||!Number.isFinite(t)?!1:e>=Math.max(2,t)}var ud={stepDeg:15},dd=`gnumarus.settings.rotation.v1`,fd=class extends Error{constructor(e){super(e),this.name=`GnumarusRotationSettingsError`}};function pd(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function md(e){return Number.isFinite(e)?Math.min(90,Math.max(1,Math.floor(e))):ud.stepDeg}function hd(e){let t;try{t=JSON.parse(e)}catch{throw new fd(`rotation settings are not valid JSON`)}if(!pd(t))throw new fd(`rotation settings root must be an object`);let{stepDeg:n}=t;if(typeof n!=`number`)throw new fd(`rotation settings have invalid fields`);return{stepDeg:md(n)}}function gd(e){return JSON.stringify({stepDeg:md(e.stepDeg)},null,2)}function _d(e,t){return`${e}\n${t}`}var vd=6e4;function yd(e){return Number.isFinite(e)?Math.min(vd,Math.max(1,Math.floor(e))):100}function bd(e,t){return yd(e==null||!Number.isFinite(e)?t:e)}function xd(e){let t=e.lastIndexOf(`
`);return{layerId:e.slice(0,t),frame:Number.parseInt(e.slice(t+1),10)}}function Sd(e,t){let n=new Map;for(let[r,i]of e){let{layerId:e,frame:a}=xd(r);n.set(_d(e,a>=t?a+1:a),i)}return n}function Cd(e,t){let n=new Map;for(let[r,i]of e)n.set(r>=t?r+1:r,i);return n}function wd(e,t,n){if(t===n)return new Map(e);let r=new Map;for(let[i,a]of e){let{layerId:e,frame:o}=xd(i),s=o===t?n:o===n?t:o;r.set(_d(e,s),a)}return r}function Td(e,t,n){let r=new Map(e),i=r.get(t),a=r.get(n);return a===void 0?r.delete(t):r.set(t,a),i===void 0?r.delete(n):r.set(n,i),r}function Ed(e){return`Frame ${e+1}`}function Dd(e){let t=e.trim().slice(0,64);return t.length===0?null:t}function Od(e,t=[]){let n=[];for(let r=0;r<e;r+=1){let e=t[r];n.push(typeof e==`string`&&Dd(e)!==null?e.trim().slice(0,64):Ed(r))}return n}function kd(e,t,n){let r=Math.min(Math.max(0,Math.floor(t)),e.length);return[...e.slice(0,r),n,...e.slice(r)]}function Ad(e,t,n){if(t===n||t<0||n<0||t>=e.length||n>=e.length)return[...e];let r=[...e],i=r[t],a=r[n];return i!==void 0&&a!==void 0&&(r[t]=a,r[n]=i),r}function jd(e,t,n,r,i){let a=new Map;for(let o of e){let e=r.get(_d(o,i))??null;if(e===null){a.set(o,{layerId:o,contentId:null,textureId:null,buffer:null,width:0,height:0,transform:{...yu}});continue}let s=n.get(e);if(s===void 0){a.set(o,{layerId:o,contentId:null,textureId:null,buffer:null,width:0,height:0,transform:{...yu}});continue}let c=s.textureId===null?null:t.get(s.textureId)??null;c===null?a.set(o,{layerId:o,contentId:e,textureId:s.textureId,buffer:null,width:0,height:0,transform:{...s.transform}}):a.set(o,{layerId:o,contentId:e,textureId:s.textureId,buffer:c.buffer,width:c.width,height:c.height,transform:{...s.transform}})}return a}var Md={mode:`checkerboard`,color:`#808080`},Nd=`gnumarus.settings.background.v1`,Pd=class extends Error{constructor(e){super(e),this.name=`GnumarusBackgroundSettingsError`}};function Fd(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function Id(e){return typeof e==`string`&&/^#[0-9a-fA-F]{6}$/.test(e)}function Ld(e){let t;try{t=JSON.parse(e)}catch{throw new Pd(`background settings are not valid JSON`)}if(!Fd(t))throw new Pd(`background settings root must be an object`);let{mode:n,color:r}=t;if(n!==`checkerboard`&&n!==`solid`)throw new Pd(`background settings have an invalid mode`);if(!Id(r))throw new Pd(`background settings have an invalid color`);return{mode:n,color:r}}function Rd(e){let t=e.mode===`solid`?`solid`:`checkerboard`,n=Id(e.color)?e.color:Md.color;return JSON.stringify({mode:t,color:n},null,2)}var zd=(e,t)=>({key:e,label:t,min:0,max:100,decimals:1,unit:`percent`}),Bd=(e,t)=>({key:e,label:t,min:0,max:360,decimals:1,unit:`degrees`}),Vd=(e,t)=>({key:e,label:t,min:0,max:255,decimals:0,unit:`byte`}),Hd=[{id:`rgb`,label:`RGB`,axes:[Vd(`r`,`Red`),Vd(`g`,`Green`),Vd(`b`,`Blue`),Vd(`a`,`Alpha`)]},{id:`cmyk`,label:`CMYK`,axes:[zd(`c`,`Cyan`),zd(`m`,`Magenta`),zd(`y`,`Yellow`),zd(`k`,`Black`),Vd(`a`,`Alpha`)]},{id:`hsv`,label:`HSV`,axes:[Bd(`h`,`Hue`),zd(`s`,`Saturation`),zd(`v`,`Value`),Vd(`a`,`Alpha`)]},{id:`hsl`,label:`HSL`,axes:[Bd(`h`,`Hue`),zd(`s`,`Saturation`),zd(`l`,`Lightness`),Vd(`a`,`Alpha`)]},{id:`okhsl`,label:`OKHSL`,axes:[Bd(`h`,`Hue`),zd(`s`,`Saturation`),zd(`l`,`Lightness`),Vd(`a`,`Alpha`)]},{id:`okhsv`,label:`OKHSV`,axes:[Bd(`h`,`Hue`),zd(`s`,`Saturation`),zd(`v`,`Value`),Vd(`a`,`Alpha`)]},{id:`ard`,label:`ARD`,axes:[Bd(`a`,`Angle`),{key:`r`,label:`Ratio`,min:0,max:255,decimals:0,unit:`byte`},{key:`d`,label:`Diagonal`,min:0,max:360,decimals:1,unit:`scalar`},Vd(`alpha`,`Alpha`)]}];function Ud(e){return Hd.find(t=>t.id===e)??Hd[0]}function Wd(e){return e===`rgb`||e===`cmyk`||e===`hsv`||e===`hsl`||e===`okhsl`||e===`okhsv`||e===`ard`}function Q(e,t,n){return Number.isFinite(e)?Math.min(n,Math.max(t,e)):t}function Gd(e){return Math.round(Q(e,0,255))}function Kd(e){return Q(e,0,100)}function qd(e){if(!Number.isFinite(e))return 0;let t=e%360;return t<0&&(t+=360),t>=360?0:t}function Jd(e,t){let n=e.trim().replace(`,`,`.`);if(n.length===0)return null;let r=Number(n);if(!Number.isFinite(r))return null;if(t.unit===`degrees`)return qd(r);if(t.unit===`scalar`){let e=10**t.decimals;return Q(Math.round(Q(r,t.min,t.max)*e)/e,t.min,t.max)}return Q(t.decimals<=0?Math.round(r):Math.round(r*10**t.decimals)/10**t.decimals,t.min,t.max)}function Yd(e){return Gd(e).toString(16).padStart(2,`0`)}function Xd(e){let t=`#${Yd(e.r)}${Yd(e.g)}${Yd(e.b)}`;return e.a>=255?t:`${t}${Yd(e.a)}`}function Zd(e){return/^[0-9a-fA-F]{2}$/.test(e)?Number.parseInt(e,16):null}function Qd(e){let t=e.trim(),n=/^#([0-9a-fA-F]{3})$/.exec(t);if(n!==null&&n[1]!==void 0){let e=n[1];return{r:Number.parseInt(e[0]+e[0],16),g:Number.parseInt(e[1]+e[1],16),b:Number.parseInt(e[2]+e[2],16),a:255}}let r=/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(t);if(r!==null&&r[1]!==void 0){let e=r[1],t=r[2],n=Zd(e.slice(0,2)),i=Zd(e.slice(2,4)),a=Zd(e.slice(4,6));if(n===null||i===null||a===null)return null;let o=255;if(t!==void 0){let e=Zd(t);if(e===null)return null;o=e}return{r:n,g:i,b:a,a:o}}return null}function $d(e){let t=Q(e,0,255)/255;return t<=.04045?t/12.92:((t+.055)/1.055)**2.4}function ef(e){let t=Q(e,0,1);return Gd((t<=.0031308?12.92*t:1.055*t**(1/2.4)-.055)*255)}function tf(e,t,n){let r=Math.max(e,t,n),i=r-Math.min(e,t,n),a=0;i>1e-9&&(a=r===e?60*((t-n)/i%6):r===t?60*((n-e)/i+2):60*((e-t)/i+4),a<0&&(a+=360));let o=r<=1e-9?0:i/r;return{h:a,s:o,v:Q(r,0,1)}}function nf(e,t,n){let r=qd(e),i=Q(t,0,1),a=Q(n,0,1),o=a*i,s=o*(1-Math.abs(r/60%2-1)),c=a-o,l=0,u=0,d=0,f=Math.floor(r/60)%6;return f===0?(l=o,u=s):f===1?(l=s,u=o):f===2?(u=o,d=s):f===3?(u=s,d=o):f===4?(l=s,d=o):(l=o,d=s),{r:l+c,g:u+c,b:d+c}}function rf(e,t,n){let r=Math.max(e,t,n),i=Math.min(e,t,n),a=(r+i)/2,o=r-i;if(o<1e-9)return{h:0,s:0,l:Q(a,0,1)};let s=o/(1-Math.abs(2*a-1)),c=0;return c=r===e?60*((t-n)/o%6):r===t?60*((n-e)/o+2):60*((e-t)/o+4),c<0&&(c+=360),{h:c,s:Q(s,0,1),l:Q(a,0,1)}}function af(e,t,n){let r=qd(e),i=Q(t,0,1),a=Q(n,0,1),o=(1-Math.abs(2*a-1))*i,s=o*(1-Math.abs(r/60%2-1)),c=a-o/2,l=0,u=0,d=0,f=Math.floor(r/60)%6;return f===0?(l=o,u=s):f===1?(l=s,u=o):f===2?(u=o,d=s):f===3?(u=s,d=o):f===4?(l=s,d=o):(l=o,d=s),{r:l+c,g:u+c,b:d+c}}function of(e,t,n){let r=nf(e,t,n);return{r:Gd(r.r*255),g:Gd(r.g*255),b:Gd(r.b*255),a:255}}function sf(e){return tf(Q(e.r,0,255)/255,Q(e.g,0,255)/255,Q(e.b,0,255)/255)}function cf(e,t,n,r,i,a){return!(i>0)||!(a>0)?{s:0,v:1}:{s:Q((e-n)/i,0,1),v:Q(1-(t-r)/a,0,1)}}function lf(e,t){return!Number.isFinite(e)||!Number.isFinite(t)||e===0&&t===0?0:(Math.atan2(e,-t)*180/Math.PI%360+360)%360}function uf(e,t,n){let r=1-Math.max(e,t,n);return r>=1-1e-9?{c:0,m:0,y:0,k:1}:{c:(1-e-r)/(1-r),m:(1-t-r)/(1-r),y:(1-n-r)/(1-r),k:r}}function df(e,t,n,r){let i=Q(e,0,1),a=Q(t,0,1),o=Q(n,0,1),s=Q(r,0,1);return{r:(1-i)*(1-s),g:(1-a)*(1-s),b:(1-o)*(1-s)}}function ff(e,t,n){let r=.4122214708*e+.5363325363*t+.0514459929*n,i=.2119034982*e+.6806995451*t+.1073969566*n,a=.0883024619*e+.2817188376*t+.6299787005*n,o=Math.cbrt(Math.max(0,r)),s=Math.cbrt(Math.max(0,i)),c=Math.cbrt(Math.max(0,a));return{l:.2104542553*o+.793617785*s-.0040720468*c,a:1.9779984951*o-2.428592205*s+.4505937099*c,b:.0259040371*o+.7827717662*s-.808675766*c}}function pf(e){let t=e.l+.3963377774*e.a+.2158037573*e.b,n=e.l-.1055613458*e.a-.0638541728*e.b,r=e.l-.0894841775*e.a-1.291485548*e.b,i=t*t*t,a=n*n*n,o=r*r*r;return{r:4.0767416621*i-3.3077115913*a+.2309699292*o,g:-1.2684380046*i+2.6097574011*a-.3413193965*o,b:-.0041960863*i-.7034186147*a+1.707614701*o}}var mf=.206,hf=.03,gf=1.206/1.03;function _f(e){return .5*(gf*e-mf+Math.sqrt((gf*e-mf)**2+4*hf*gf*e))}function vf(e){return(e*e+mf*e)/(gf*(e+hf))}function yf(e,t){let n,r,i,a,o,s,c,l;-1.88170328*e-.80936493*t>1?(n=1.19086277,r=1.76576728,i=.59662641,a=.75515197,o=.56771245,s=4.0767416621,c=-3.3077115913,l=.2309699292):1.81444104*e-1.19445276*t>1?(n=.73956515,r=-.45954404,i=.08285427,a=.1254107,o=.14503204,s=-1.2684380046,c=2.6097574011,l=-.3413193965):(n=1.35733652,r=-.00915799,i=-1.1513021,a=-.50559606,o=.00692167,s=-.0041960863,c=-.7034186147,l=1.707614701);let u=n+r*e+i*t+a*e*e+o*e*t,d=.3963377774*e+.2158037573*t,f=-.1055613458*e-.0638541728*t,p=-.0894841775*e-1.291485548*t,m=1+u*d,h=1+u*f,g=1+u*p,_=m*m*m,v=h*h*h,y=g*g*g,b=3*d*m*m,x=3*f*h*h,S=3*p*g*g,C=6*d*d*m,w=6*f*f*h,T=6*p*p*g,E=s*_+c*v+l*y,D=s*b+c*x+l*S,O=s*C+c*w+l*T,k=D*D-.5*E*O;return Math.abs(k)>1e-12&&(u-=E*D/k),u}function bf(e,t){let n=yf(e,t),r=pf({l:1,a:n*e,b:n*t}),i=Math.cbrt(1/Math.max(Math.max(r.r,r.g),Math.max(r.b,1e-12)));return{l:i,c:i*n}}function xf(e){return{s:e.c/Math.max(e.l,1e-12),t:e.c/Math.max(1-e.l,1e-12)}}function Sf(e,t){return{s:.11516993+1/(7.4477897+4.1590124*t+e*(-2.19557347+1.75198401*t+e*(-2.13704948-10.02301043*t+e*(-4.24894561+5.38770819*t+4.69891013*e)))),t:.11239642+1/(1.6132032-.68124379*t+e*(.40370612+.90148123*t+e*(-.27087943+.6122399*t+e*(.00299215-.45399568*t-.14661872*e))))}}function Cf(e,t,n,r,i,a){let o;if((n-i)*a.c-(a.l-i)*r<=0){let e=r*a.l+a.c*(i-n);if(Math.abs(e)<1e-12)return 0;o=a.c*i/e}else{let s=r*(a.l-1)+a.c*(i-n);if(Math.abs(s)<1e-12)return 1;o=a.c*(i-1)/s;let c=n-i,l=r,u=.3963377774*e+.2158037573*t,d=-.1055613458*e-.0638541728*t,f=-.0894841775*e-1.291485548*t,p=c+l*u,m=c+l*d,h=c+l*f,g=i*(1-o)+o*n,_=o*r,v=g+_*u,y=g+_*d,b=g+_*f,x=v*v*v,S=y*y*y,C=b*b*b,w=3*p*v*v,T=3*m*y*y,E=3*h*b*b,D=6*p*p*v,O=6*m*m*y,k=6*h*h*b,A=4.0767416621*x-3.3077115913*S+.2309699292*C-1,j=4.0767416621*w-3.3077115913*T+.2309699292*E,M=4.0767416621*D-3.3077115913*O+.2309699292*k,N=-1.2684380046*x+2.6097574011*S-.3413193965*C-1,P=-1.2684380046*w+2.6097574011*T-.3413193965*E,ee=-1.2684380046*D+2.6097574011*O-.3413193965*k,F=-.0041960863*x-.7034186147*S+1.707614701*C-1,te=-.0041960863*w-.7034186147*T+1.707614701*E,ne=-.0041960863*D-.7034186147*O+1.707614701*k,re=j/(j*j-.5*A*M),ie=P/(P*P-.5*N*ee),I=te/(te*te-.5*F*ne),ae=-A*re,oe=-N*ie,se=-F*I;ae=re>=0?ae:1/0,oe=ie>=0?oe:1/0,se=I>=0?se:1/0,o+=Math.min(ae,Math.min(oe,se))}return o}function wf(e,t,n){let r=bf(t,n),i=Cf(t,n,e,1,e,r),a=xf(r),o=i/Math.max(Math.min(e*a.s,(1-e)*a.t),1e-12),s=Sf(t,n),c=e*s.s,l=(1-e)*s.t,u=.9*o*Math.sqrt(Math.sqrt(1/(1/(c*c*c*c+1e-12)+1/(l*l*l*l+1e-12))))||0,d=e*.4,f=(1-e)*.8;return{c0:Math.sqrt(1/(1/(d*d+1e-12)+1/(f*f+1e-12))),cMid:u,cMax:i}}function Tf(e,t,n){let r=ff(Q(e,0,1),Q(t,0,1),Q(n,0,1)),i=Math.sqrt(r.a*r.a+r.b*r.b);if(i<1e-6)return{h:0,s:0,l:_f(Q(r.l,0,1))};let a=r.a/i,o=r.b/i,s=r.l,c=.5+.5*Math.atan2(-r.b,-r.a)/Math.PI;Number.isFinite(c)||(c=0),c=(c%1+1)%1;let l=wf(s,a,o),u=.8,d=1.25,f;if(i<l.cMid){let e=u*l.c0;f=i/(e+(1-e/Math.max(l.cMid,1e-12))*i)*u}else{let e=l.cMid,t=.19999999999999996*l.cMid*l.cMid*d*d/Math.max(l.c0,1e-12),n=1-t/Math.max(l.cMax-l.cMid,1e-12);f=u+.19999999999999996*((i-e)/(t+n*(i-e)))}return{h:c*360,s:Q(f,0,1),l:_f(Q(s,0,1))}}function Ef(e,t,n){let r=qd(e)/360,i=Q(t,0,1),a=Q(n,0,1);if(a>=1-1e-9)return{r:1,g:1,b:1};if(a<=1e-9)return{r:0,g:0,b:0};let o=Math.cos(2*Math.PI*r),s=Math.sin(2*Math.PI*r),c=vf(a),l=wf(c,o,s),u=.8,d=1.25,f;if(i<u){let e=d*i,t=u*l.c0,n=1-t/Math.max(l.cMid,1e-12);f=e*t/(1-n*e)}else{let e=(i-u)/.19999999999999996,t=l.cMid,n=.19999999999999996*l.cMid*l.cMid*d*d/Math.max(l.c0,1e-12),r=1-n/Math.max(l.cMax-l.cMid,1e-12);f=t+e*n/(1-r*e)}return pf({l:c,a:f*o,b:f*s})}function Df(e,t,n){let r=ff(Q(e,0,1),Q(t,0,1),Q(n,0,1)),i=Math.sqrt(r.a*r.a+r.b*r.b),a=r.l;if(i<1e-6||a<1e-9)return a<1e-9?{h:0,s:0,v:0}:{h:0,s:0,v:_f(Q(a,0,1))};let o=r.a/i,s=r.b/i,c=.5+.5*Math.atan2(-r.b,-r.a)/Math.PI;Number.isFinite(c)||(c=0),c=(c%1+1)%1;let l=xf(bf(o,s)),u=l.s,d=l.t,f=.5,p=1-f/Math.max(u,1e-12),m=d/(i+a*d),h=m*a,g=m*i;if(h<1e-12)return{h:c*360,s:0,v:0};let _=vf(h),v=g*_/h,y=pf({l:_,a:o*v,b:s*v}),b=_f(Q(a/Math.cbrt(1/Math.max(Math.max(y.r,y.g),Math.max(y.b,1e-12))),0,1))/h,x=(f+d)*g/(d*f+d*p*g);return{h:c*360,s:Q(x,0,1),v:Q(b,0,1)}}function Of(e,t,n){let r=qd(e)/360,i=Q(t,0,1),a=Q(n,0,1);if(a<=1e-9)return{r:0,g:0,b:0};let o=Math.cos(2*Math.PI*r),s=Math.sin(2*Math.PI*r),c=xf(bf(o,s)),l=c.s,u=c.t,d=.5,f=1-d/Math.max(l,1e-12),p=1-i*d/(d+u-u*f*i),m=i*u*d/(d+u-u*f*i),h=vf(p),g=m*h/Math.max(p,1e-12),_=pf({l:h,a:o*g,b:s*g}),v=Math.cbrt(1/Math.max(Math.max(_.r,_.g),Math.max(_.b,1e-12))),y=vf(a*p),b=m*y/Math.max(p,1e-12);return pf({l:y*v,a:b*o*v,b:b*s*v})}var kf=[1/Math.SQRT2,-1/Math.SQRT2,0],Af=[1/Math.sqrt(6),1/Math.sqrt(6),-2/Math.sqrt(6)];function jf(e,t,n,r){let i=1/0,a=[[e,t],[e,n],[e,r]];for(let[e,t]of a)t>1e-12?i=Math.min(i,(1-e)/t):t<-1e-12&&(i=Math.min(i,(0-e)/t));return!Number.isFinite(i)||i<0?0:i}function Mf(e,t,n){let r=(Q(e,0,1)+Q(t,0,1)+Q(n,0,1))/3,i=Q(e,0,1)-r,a=Q(t,0,1)-r,o=Q(n,0,1)-r,s=i*kf[0]+a*kf[1]+o*kf[2],c=i*Af[0]+a*Af[1]+o*Af[2],l=Math.sqrt(s*s+c*c);if(l<1e-9)return{a:0,r:0,d:r};let u=(Math.atan2(c,s)*180/Math.PI+360)%360,d=Math.sqrt(s*s+c*c),f=jf(r,s/d*kf[0]+c/d*Af[0],s/d*kf[1]+c/d*Af[1],s/d*kf[2]+c/d*Af[2]);return{a:u,r:f>1e-12?Q(l/f,0,1):0,d:r}}function Nf(e,t,n){let r=Q(n,0,1),i=Q(t,0,1),a=qd(e)*Math.PI/180,o=Math.cos(a),s=Math.sin(a),c=o*kf[0]+s*Af[0],l=o*kf[1]+s*Af[1],u=o*kf[2]+s*Af[2],d=i*jf(r,c,l,u);return{r:Q(r+d*c,0,1),g:Q(r+d*l,0,1),b:Q(r+d*u,0,1)}}function Pf(e,t){let n=Q(e.r,0,255)/255,r=Q(e.g,0,255)/255,i=Q(e.b,0,255)/255;switch(t){case`rgb`:return[e.r,e.g,e.b,Gd(e.a)];case`cmyk`:{let t=uf(n,r,i);return[t.c*100,t.m*100,t.y*100,t.k*100,Gd(e.a)]}case`hsv`:{let t=tf(n,r,i);return[t.h,t.s*100,t.v*100,Gd(e.a)]}case`hsl`:{let t=rf(n,r,i);return[t.h,t.s*100,t.l*100,Gd(e.a)]}case`okhsl`:{let t={r:$d(e.r),g:$d(e.g),b:$d(e.b)},n=Tf(t.r,t.g,t.b);return[qd(n.h),Kd(n.s*100),Kd(n.l*100),Gd(e.a)]}case`okhsv`:{let t={r:$d(e.r),g:$d(e.g),b:$d(e.b)},n=Df(t.r,t.g,t.b);return[qd(n.h),Kd(n.s*100),Kd(n.v*100),Gd(e.a)]}case`ard`:{let t=Mf(n,r,i);return[qd(t.a),Q(t.r*255,0,255),Q(t.d*360,0,360),Gd(e.a)]}}}function Ff(e,t){return Ud(e).axes.map((e,n)=>{let r=t[n]??e.min;return e.unit===`degrees`?qd(r):e.unit===`byte`?Gd(r):Q(r,e.min,e.max)})}function If(e,t){let n=Ff(e,t);switch(e){case`rgb`:return{r:Gd(n[0]??0),g:Gd(n[1]??0),b:Gd(n[2]??0)};case`cmyk`:{let e=df((n[0]??0)/100,(n[1]??0)/100,(n[2]??0)/100,(n[3]??0)/100);return{r:Gd(e.r*255),g:Gd(e.g*255),b:Gd(e.b*255)}}case`hsv`:{let e=nf(n[0]??0,(n[1]??0)/100,(n[2]??0)/100);return{r:Gd(e.r*255),g:Gd(e.g*255),b:Gd(e.b*255)}}case`hsl`:{let e=af(n[0]??0,(n[1]??0)/100,(n[2]??0)/100);return{r:Gd(e.r*255),g:Gd(e.g*255),b:Gd(e.b*255)}}case`okhsl`:{let e=Ef(n[0]??0,(n[1]??0)/100,(n[2]??0)/100);return{r:ef(e.r),g:ef(e.g),b:ef(e.b)}}case`okhsv`:{let e=Of(n[0]??0,(n[1]??0)/100,(n[2]??0)/100);return{r:ef(e.r),g:ef(e.g),b:ef(e.b)}}case`ard`:{let e=Nf(n[0]??0,(n[1]??0)/255,(n[2]??0)/360);return{r:Gd(e.r*255),g:Gd(e.g*255),b:Gd(e.b*255)}}}}function Lf(e,t,n=255){let r=Ud(e).axes.findIndex(e=>e.label===`Alpha`);if(r<0)return Gd(n);let i=t[r];return Gd(typeof i==`number`&&Number.isFinite(i)?i:n)}function Rf(e,t,n,r=11){let i=Ud(e).axes[t];if(i===void 0)return`linear-gradient(to right, #000000, #ffffff)`;let a=Math.max(2,Math.floor(r)),o=[],s=i.label===`Alpha`,c=s?If(e,n):null;for(let r=0;r<a;r+=1){let l=a===1?0:r/(a-1),u=[...n];u[t]=i.min+l*(i.max-i.min);let d=Math.round(l*1e3)/10;if(s&&c!==null){let e=Math.round((i.min+l*(i.max-i.min))*10)/10/255;o.push(`rgba(${c.r}, ${c.g}, ${c.b}, ${Math.min(1,Math.max(0,e))}) ${d}%`);continue}let f=If(e,u);o.push(`rgb(${f.r}, ${f.g}, ${f.b}) ${d}%`)}return`linear-gradient(to right, ${o.join(`, `)})`}function zf(e,t,n,r){let i=n,a=r,o=-1,s=-1;for(let c=0;c<r;c+=1)for(let r=0;r<n;r+=1){let l=(c*n+r)*4;(e[l]!==t[l]||e[l+1]!==t[l+1]||e[l+2]!==t[l+2]||e[l+3]!==t[l+3])&&(r<i&&(i=r),r>o&&(o=r),c<a&&(a=c),c>s&&(s=c))}if(o<0)return null;let c=o-i+1,l=s-a+1,u=new Uint8ClampedArray(c*l*4),d=new Uint8ClampedArray(c*l*4);for(let r=0;r<l;r+=1){let o=((a+r)*n+i)*4;u.set(e.subarray(o,o+c*4),r*c*4),d.set(t.subarray(o,o+c*4),r*c*4)}return{x:i,y:a,w:c,h:l,before:u,after:d}}function Bf(e,t,n,r){let i=r===`before`?n.before:n.after;for(let r=0;r<n.h;r+=1){let a=((n.y+r)*t+n.x)*4;e.set(i.subarray(r*n.w*4,(r+1)*n.w*4),a)}}var Vf=class{undoStack=[];redoStack=[];maxEntries;constructor(e=100){this.maxEntries=Math.max(1,Math.floor(e))}push(e){this.undoStack.push(e);let t=0;for(;this.undoStack.length>this.maxEntries;)this.undoStack.shift(),t+=1;return this.redoStack.length=0,t}undoDepth(){return this.undoStack.length}redoDepth(){return this.redoStack.length}canUndo(){return this.undoStack.length>0}canRedo(){return this.redoStack.length>0}undo(e,t,n,r,i,a,o){for(;;){let s=this.undoStack.pop();if(s===void 0)return!1;if(s.type===`stroke`){let t=e(s.layerId);if(t===null)continue;return Bf(t.buffer,t.width,s.diff,`before`),this.redoStack.push(s),!0}if(s.type===`resize`){if(n===void 0||!n(s.resize.layerId,s.resize.beforeWidth,s.resize.beforeHeight,s.resize.beforeBuffer))continue;return this.redoStack.push(s),!0}if(s.type===`fit`){if(r===void 0||!r(s.fit.textureId,s.fit.beforeWidth,s.fit.beforeHeight,s.fit.beforeBuffer,s.fit.transforms.map(e=>({contentId:e.contentId,transform:{...e.before}}))))continue;return this.redoStack.push(s),!0}if(!s.merge.removedLayer&&i===void 0||s.merge.associatedCell!==null&&a===void 0||s.merge.textureLink!==null&&o===void 0)continue;let c=e(s.merge.lowerLayerId);if(c===null)continue;if(s.merge.lowerDiff!==null&&Bf(c.buffer,c.width,s.merge.lowerDiff,`before`),s.merge.removedLayer)t(s.merge.upper);else{let e=s.merge.dissociatedCell;if(e===null||i===void 0||!i(e.layer,e.frame,e.content))continue}let l=s.merge.associatedCell;if(l!==null&&(a===void 0||!a(l.layer,l.frame)))continue;let u=s.merge.textureLink;if(u===null||o!==void 0&&o(u.contentId,u.before))return this.redoStack.push(s),!0}}redo(e,t,n,r,i,a,o){for(;;){let s=this.redoStack.pop();if(s===void 0)return!1;if(s.type===`stroke`){let t=e(s.layerId);if(t===null)continue;return Bf(t.buffer,t.width,s.diff,`after`),this.undoStack.push(s),!0}if(s.type===`resize`){if(n===void 0||!n(s.resize.layerId,s.resize.afterWidth,s.resize.afterHeight,s.resize.afterBuffer))continue;return this.undoStack.push(s),!0}if(s.type===`fit`){if(r===void 0||!r(s.fit.textureId,s.fit.afterWidth,s.fit.afterHeight,s.fit.afterBuffer,s.fit.transforms.map(e=>({contentId:e.contentId,transform:{...e.after}}))))continue;return this.undoStack.push(s),!0}if(!s.merge.removedLayer&&i===void 0||s.merge.associatedCell!==null&&a===void 0||s.merge.textureLink!==null&&o===void 0)continue;let c=e(s.merge.lowerLayerId);if(c===null)continue;if(s.merge.lowerDiff!==null&&Bf(c.buffer,c.width,s.merge.lowerDiff,`after`),s.merge.removedLayer)t(s.merge.upper.id);else{let e=s.merge.dissociatedCell;if(e===null||i===void 0||!i(e.layer,e.frame))continue}let l=s.merge.associatedCell;if(l!==null&&(a===void 0||!a(l.layer,l.frame,l.content)))continue;let u=s.merge.textureLink;if(u===null||o!==void 0&&o(u.contentId,u.after))return this.undoStack.push(s),!0}}clear(){this.undoStack.length=0,this.redoStack.length=0}};function Hf(e,t,n){let r=Math.cos(t)*n,i=Math.sin(t)*n;return e===`x`?[0,r,i]:e===`y`?[r,0,i]:[r,i,0]}function Uf(e,t){return e===`x`?[[-t,0,0],[t,0,0]]:e===`y`?[[0,-t,0],[0,t,0]]:[[0,0,-t],[0,0,t]]}function Wf(e,t,n,r){let i=(r.left+(r.width-t)/2)*(e.flipX?-1:1),a=(r.top+(r.height-n)/2)*(e.flipY?-1:1),o=Su(e);return{...e,x:e.x+o.a*i+o.b*a,y:e.y+o.c*i+o.d*a}}var Gf=`varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,Kf=`precision mediump float;
varying vec2 vUv;
uniform float uImageW;
uniform float uImageH;
uniform float uMode;
uniform float uSizeX;
uniform float uSizeY;
uniform float uPixelRatio;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uSolidColor;
void main() {
  if (uMode > 1.5) {
    gl_FragColor = vec4(uSolidColor, 1.0);
    return;
  }
  vec2 cell = vec2(max(uSizeX, 1.0), max(uSizeY, 1.0));
  vec2 grid = uMode < 0.5
    ? floor(vec2(vUv.x * uImageW, vUv.y * uImageH) / cell)
    : floor(gl_FragCoord.xy / max(cell * uPixelRatio, vec2(1.0)));
  float c = mod(grid.x + grid.y, 2.0);
  vec3 check = mix(uColorA, uColorB, c);
  gl_FragColor = vec4(check, 1.0);
}`,qf=`precision mediump float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uOpacity;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
}`,Jf=`precision highp float;
varying vec2 vUv;
uniform float uLayerW;
uniform float uLayerH;
void main() {
  if (uLayerW < 1.0 || uLayerH < 1.0) { discard; }
  vec2 coord = vec2(vUv.x * uLayerW, vUv.y * uLayerH);
  vec2 fw = fwidth(coord);
  vec2 g = abs(fract(coord - 0.5) - 0.5) / max(fw, vec2(1e-4));
  float line = 1.0 - min(min(g.x, g.y), 1.0);
  if (line < 0.02) { discard; }
  gl_FragColor = vec4(1.0, 1.0, 1.0, line * 0.45);
}`;function Yf(e){let t=pu(e)??{r:199,g:199,b:199,a:255};return new K(t.r/255,t.g/255,t.b/255)}var Xf=class extends Error{constructor(e){super(e),this.name=`GnumarusWebGlError`}};function Zf(e){return typeof WebGL2RenderingContext<`u`&&e instanceof WebGL2RenderingContext}var Qf=class{container;renderer;scene;camera;sharedGeometry;backgroundMaterial;backgroundPlane;resizeObserver;layers=[];activeLayerId=``;layerCounter=1;textures=new Map;contents=new Map;cells=new Map;frameCount=1;currentFrame=0;frameDurations=new Map;defaultFrameDuration=100;frameNames=[Ed(0)];frameNameCounter=2;contentCounter=1;textureCounter=1;textureNameCounter=1;imageWidth;imageHeight;zoom;panX=0;panY=0;rotation=0;rotationStepDeg=ud.stepDeg;flipX=!1;flipY=!1;tool=`pencil`;toolBeforeEyedropper=null;tempEyedropper=!1;rotating=!1;lastPointerAngle=null;loupeZooming=!1;loupeAnchor=null;transforming=!1;transformStart=null;transformRotating=!1;transformLastAngle=null;color={r:0,g:0,b:0,a:255};blendMode=`normal`;blendBeforeEraser=`normal`;accumulate=!0;brushSize=1;brushShape=`square`;pencilAntialias=!1;pencilPixelPerfect=!1;curvePixelPerfect=!1;pencilPixelPerfectStroke=new vu;stabilizerMode=Vu;ropeLength=20;followStrength=20;stabilizerPos=null;stabilizerTarget=null;followLoopId=null;lineWidth=1;lineShape=`square`;lineAntialias=!1;lineAnchor=null;curveWidth=1;curveShape=`square`;curveAntialias=!1;curvePhase=`idle`;curveP0=null;curveP3=null;curveC1=null;curveDragCurrent=null;lastMouseClient=null;previewTip;previewStabilizer;previewSvg;previewLine;previewCurve;previewHandleA;previewHandleB;previewStabilizerLine;previewSelectWhite;previewSelectBlack;selectionHandles=[];rot3dRings;rot3dAxes;previewMarkers;drawing=!1;panning=!1;spaceDown=!1;sizeDrag=null;strokeBase=null;strokeLayerId=null;strokeMask=null;history=new Vf(100);lastPixel=null;cursor=null;floating=null;rectDrag=null;moveDrag=null;resizeDrag=null;rotateDrag=null;skewDrag=null;centerTap=null;flipTap=null;layerResizeDrag=null;layerRotateDrag=null;layerSkewDrag=null;layerCenterTap=null;layerFlipTap=null;trackballDrag=null;rot3dCenterTap=null;axisDrag=null;floatingPlane=null;floatingPlaneFor=null;floatingMaterial=null;floatingTexture=null;disposed=!1;checkerMode;checkerSizeX;checkerSizeY;checkerColorA;checkerColorB;checkerColorAVec;checkerColorBVec;backgroundMode;backgroundColor;backgroundColorVec;gridMinZoom;gridMaterial;gridPlane;axisXMaterial;axisXLine;axisYMaterial;axisYLine;borderMaterial;borderLine;onStats;onPixelsChanged;onToolChanged;onLayersChanged;onToolSizeChanged;onEyedropperPick;onTransformChanged;constructor(e,t){this.container=e,this.onStats=t.onStats,this.onPixelsChanged=t.onPixelsChanged,this.onToolChanged=t.onToolChanged,this.onLayersChanged=t.onLayersChanged,this.onToolSizeChanged=t.onToolSizeChanged,this.onEyedropperPick=t.onEyedropperPick,this.onTransformChanged=t.onTransformChanged;let n=t.checker??Ju;this.checkerMode=n.mode,this.checkerSizeX=$u(n.sizeX),this.checkerSizeY=$u(n.sizeY),this.checkerColorA=n.colorA,this.checkerColorB=n.colorB,this.checkerColorAVec=Yf(n.colorA),this.checkerColorBVec=Yf(n.colorB);let r=t.background??Md;this.backgroundMode=r.mode===`solid`?`solid`:`checkerboard`,this.backgroundColor=r.color,this.backgroundColorVec=Yf(r.color),this.gridMinZoom=od(t.gridMinZoom??nd.minZoom),this.imageWidth=64,this.imageHeight=64,this.zoom=8;let i;try{i=new Nl({antialias:!1,alpha:!0,powerPreference:`high-performance`,preserveDrawingBuffer:!1})}catch{throw new Xf(`WebGL2 is unavailable in this browser.`)}if(!Zf(i.getContext()))throw i.dispose(),new Xf(`WebGL2 is unavailable in this browser.`);this.renderer=i,this.renderer.setClearColor(3355443,1),this.renderer.domElement.style.display=`block`,this.renderer.domElement.style.width=`100%`,this.renderer.domElement.style.height=`100%`,this.renderer.domElement.style.touchAction=`none`,e.appendChild(this.renderer.domElement),this.previewTip=document.createElement(`div`),this.previewTip.setAttribute(`data-testid`,`brush-preview`),this.previewTip.style.position=`absolute`,this.previewTip.style.pointerEvents=`none`,this.previewTip.style.display=`none`,this.previewTip.style.border=`1px solid #ffffff`,this.previewTip.style.boxShadow=`0 0 0 1px #000000`,this.previewTip.style.boxSizing=`border-box`,this.previewTip.style.zIndex=`5`,e.appendChild(this.previewTip),this.previewStabilizer=document.createElement(`div`),this.previewStabilizer.setAttribute(`data-testid`,`stabilizer-preview`),this.previewStabilizer.style.position=`absolute`,this.previewStabilizer.style.pointerEvents=`none`,this.previewStabilizer.style.display=`none`,this.previewStabilizer.style.width=`10px`,this.previewStabilizer.style.height=`10px`,this.previewStabilizer.style.border=`2px solid #00e5ff`,this.previewStabilizer.style.borderRadius=`50%`,this.previewStabilizer.style.boxShadow=`0 0 0 1px #000000`,this.previewStabilizer.style.boxSizing=`border-box`,this.previewStabilizer.style.zIndex=`7`,e.appendChild(this.previewStabilizer),this.previewSvg=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`),this.previewSvg.setAttribute(`data-testid`,`line-preview`),this.previewSvg.style.position=`absolute`,this.previewSvg.style.inset=`0`,this.previewSvg.style.width=`100%`,this.previewSvg.style.height=`100%`,this.previewSvg.style.pointerEvents=`none`,this.previewSvg.style.display=`none`,this.previewSvg.style.zIndex=`6`,this.previewSvg.style.overflow=`visible`,this.previewLine=document.createElementNS(`http://www.w3.org/2000/svg`,`line`),this.previewLine.setAttribute(`fill`,`none`),this.previewLine.setAttribute(`opacity`,`0.9`),this.previewSvg.appendChild(this.previewLine),this.previewCurve=document.createElementNS(`http://www.w3.org/2000/svg`,`path`),this.previewCurve.setAttribute(`data-testid`,`curve-preview`),this.previewCurve.setAttribute(`fill`,`none`),this.previewCurve.setAttribute(`opacity`,`0.9`),this.previewSvg.appendChild(this.previewCurve);let a=e=>{let t=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);return t.setAttribute(`data-testid`,e),t.setAttribute(`stroke`,`#ffffff`),t.setAttribute(`stroke-width`,`1`),t.setAttribute(`opacity`,`0.85`),this.previewSvg.appendChild(t),t};this.previewHandleA=a(`curve-handle-a`),this.previewHandleB=a(`curve-handle-b`),this.previewStabilizerLine=document.createElementNS(`http://www.w3.org/2000/svg`,`line`),this.previewStabilizerLine.setAttribute(`data-testid`,`stabilizer-rope`),this.previewStabilizerLine.setAttribute(`stroke`,`#00e5ff`),this.previewStabilizerLine.setAttribute(`stroke-width`,`1`),this.previewStabilizerLine.setAttribute(`stroke-dasharray`,`4 3`),this.previewStabilizerLine.setAttribute(`opacity`,`0.9`),this.previewStabilizerLine.style.display=`none`,this.previewSvg.appendChild(this.previewStabilizerLine);let o=(e,t,n)=>{let r=document.createElementNS(`http://www.w3.org/2000/svg`,`polygon`);e!==null&&r.setAttribute(`data-testid`,e),r.setAttribute(`fill`,`none`),r.setAttribute(`stroke`,t),r.setAttribute(`stroke-width`,`1.5`),r.setAttribute(`stroke-dasharray`,`6 4`),r.setAttribute(`opacity`,`0.95`);let i=document.createElementNS(`http://www.w3.org/2000/svg`,`animate`);return i.setAttribute(`attributeName`,`stroke-dashoffset`),i.setAttribute(`from`,`0`),i.setAttribute(`to`,n),i.setAttribute(`dur`,`1s`),i.setAttribute(`repeatCount`,`indefinite`),r.appendChild(i),r.style.display=`none`,this.previewSvg.appendChild(r),r};this.previewSelectWhite=o(`selection-rect`,`#ffffff`,`-20`),this.previewSelectBlack=o(null,`#000000`,`-10`);let s=`http://www.w3.org/2000/svg`,c=(e,t,n)=>{let r=document.createElementNS(s,t);for(let[e,t]of Object.entries(n))r.setAttribute(e,t);return e.appendChild(r),r},l={fill:`none`,stroke:`#000000`,"stroke-width":`4`,opacity:`0.9`},u={fill:`none`,stroke:`#ffffff`,"stroke-width":`2`,opacity:`0.95`},d={fill:`#ffffff`,stroke:`#000000`,"stroke-width":`1`,opacity:`0.95`},f=e=>{let t=document.createElementNS(s,`g`);return t.setAttribute(`data-testid`,`pp-handle`),t.setAttribute(`data-handle`,e),t.style.display=`none`,t.style.pointerEvents=`none`,this.previewSvg.appendChild(t),this.selectionHandles.push({id:e,group:t}),t};for(let e of[`resize-nw`,`resize-ne`,`resize-se`,`resize-sw`,`resize-n`,`resize-s`,`resize-e`,`resize-w`])c(f(e),`rect`,{x:`-4`,y:`-4`,width:`8`,height:`8`,...d});for(let e of[`rotate-nw`,`rotate-ne`,`rotate-se`,`rotate-sw`]){let t=f(e);c(t,`path`,{d:`M -7 0 A 7 7 0 0 1 0 -7`,...l}),c(t,`path`,{d:`M -7 0 A 7 7 0 0 1 0 -7`,...u}),c(t,`polygon`,{points:`-7,-4 -11,1 -3,1`,...d}),c(t,`polygon`,{points:`1,-7 -4,-11 -4,-3`,...d})}for(let e of[`skew-n`,`skew-s`,`skew-e`,`skew-w`]){let t=f(e);c(t,`line`,{x1:`-7`,y1:`0`,x2:`7`,y2:`0`,...l}),c(t,`line`,{x1:`-7`,y1:`0`,x2:`7`,y2:`0`,...u}),c(t,`polygon`,{points:`-11,0 -5,-3 -5,3`,...d}),c(t,`polygon`,{points:`11,0 5,-3 5,3`,...d})}for(let e of[`flip-n`,`flip-s`,`flip-e`,`flip-w`]){let t=f(e);c(t,`line`,{x1:`-7`,y1:`0`,x2:`7`,y2:`0`,...l}),c(t,`line`,{x1:`-7`,y1:`0`,x2:`7`,y2:`0`,...u}),c(t,`polygon`,{points:`-11,0 -5,-3 -5,3`,...d}),c(t,`polygon`,{points:`11,0 5,-3 5,3`,...d})}let p=f(`center`);c(p,`circle`,{cx:`0`,cy:`0`,r:`6.5`,...l}),c(p,`circle`,{cx:`0`,cy:`0`,r:`6.5`,...u}),c(p,`polygon`,{points:`0,-9.5 -3.5,-4 3.5,-4`,...d});let m={x:`#ff0000`,y:`#00ff00`,z:`#0000ff`},h=(e,t)=>{let n=document.createElementNS(s,`path`);return n.setAttribute(`fill`,`none`),n.setAttribute(`stroke`,m[e]),n.setAttribute(`stroke-width`,`2.5`),n.setAttribute(`opacity`,t?`0.95`:`0.45`),t||n.setAttribute(`stroke-dasharray`,`5 4`),n.style.display=`none`,n.style.pointerEvents=`none`,this.previewSvg.appendChild(n),n};this.rot3dRings={x:{front:h(`x`,!0),back:h(`x`,!1)},y:{front:h(`y`,!0),back:h(`y`,!1)},z:{front:h(`z`,!0),back:h(`z`,!1)}};let g=e=>{let t=document.createElementNS(s,`line`);return t.setAttribute(`stroke`,m[e]),t.setAttribute(`stroke-width`,`2`),t.setAttribute(`opacity`,`0.9`),t.style.display=`none`,t.style.pointerEvents=`none`,this.previewSvg.appendChild(t),t};this.rot3dAxes={x:g(`x`),y:g(`y`),z:g(`z`)};for(let e of[`rot3d-x`,`rot3d-y`,`rot3d-z`])c(f(e),`circle`,{cx:`0`,cy:`0`,r:`6`,fill:m[e.slice(-1)],stroke:`#000000`,"stroke-width":`1.5`,opacity:`0.95`});this.previewMarkers=[];for(let e=0;e<4;e+=1){let t=document.createElementNS(`http://www.w3.org/2000/svg`,`circle`);t.setAttribute(`data-testid`,`curve-point-${e}`),t.setAttribute(`r`,`3.5`),t.setAttribute(`fill`,`#ffffff`),t.setAttribute(`stroke`,`#000000`),t.setAttribute(`stroke-width`,`1`),t.setAttribute(`opacity`,`0.95`),this.previewSvg.appendChild(t),this.previewMarkers.push(t)}e.appendChild(this.previewSvg),this.scene=new Tr,this.camera=new io(-1,1,1,-1,-10,10),this.camera.position.set(0,0,1),this.camera.lookAt(0,0,0),this.sharedGeometry=new _a(1,1),this.backgroundMaterial=new Ea({uniforms:{uImageW:{value:this.imageWidth},uImageH:{value:this.imageHeight},uMode:{value:this.backgroundMode===`solid`?2:+(this.checkerMode===`screen`)},uSizeX:{value:this.checkerSizeX},uSizeY:{value:this.checkerSizeY},uPixelRatio:{value:1},uColorA:{value:this.checkerColorAVec},uColorB:{value:this.checkerColorBVec},uSolidColor:{value:this.backgroundColorVec}},vertexShader:Gf,fragmentShader:Kf,side:2}),this.backgroundPlane=new Ui(this.sharedGeometry,this.backgroundMaterial),this.backgroundPlane.matrixAutoUpdate=!1,this.backgroundPlane.renderOrder=-1,this.scene.add(this.backgroundPlane),this.gridMaterial=new Ea({uniforms:{uLayerW:{value:64},uLayerH:{value:64}},vertexShader:Gf,fragmentShader:Jf,side:2,transparent:!0,depthWrite:!1}),this.gridPlane=new Ui(this.sharedGeometry,this.gridMaterial),this.gridPlane.matrixAutoUpdate=!1,this.gridPlane.renderOrder=1e3,this.gridPlane.visible=!1,this.scene.add(this.gridPlane);let _=e=>{let t=new $i({color:e,transparent:!0,depthWrite:!1}),n=new yi;n.setAttribute(`position`,new ii(new Float32Array(18),3));let r=new da(n,t);return r.frustumCulled=!1,r.renderOrder=1001,r.visible=!1,this.scene.add(r),{material:t,line:r}},v=_(16711680);this.axisXMaterial=v.material,this.axisXLine=v.line;let y=_(65280);this.axisYMaterial=y.material,this.axisYLine=y.line;let b=_(16711935);this.borderMaterial=b.material,this.borderLine=b.line;let x=this.createLayerInternal(`layer0`,`Layer 1`,!0,1,Bl(64,64),64,64,{...yu});this.layers.push(x),this.activeLayerId=x.id,this.layerCounter=1,this.textureNameCounter=1,this.textures.set(`layer0`,{id:`layer0`,name:this.nextTextureName(),width:64,height:64,buffer:x.buffer}),this.contents.set(`content1`,{id:`content1`,name:`Content 1`,textureId:`layer0`,transform:{...yu}}),this.cells.set(_d(`layer0`,0),`content1`),this.frameCount=1,this.currentFrame=0,this.frameNames=[Ed(0)],this.frameNameCounter=2,this.contentCounter=2,this.textureCounter=1,this.syncAllLayerRenders(),this.resizeObserver=new ResizeObserver(()=>this.layout()),this.resizeObserver.observe(e),this.attachEvents(),this.layout(),this.resetView()}get size(){return{width:this.imageWidth,height:this.imageHeight}}get currentZoom(){return this.zoom}get activeLayerPixels(){return this.activeLayer()?.buffer??null}createLayerInternal(e,t,n,r,i,a,o,s,c=void 0){let l=new Ki(i,a,o);l.magFilter=Ee,l.minFilter=Ee,l.generateMipmaps=!1,l.flipY=!0,l.needsUpdate=!0;let u=Math.min(1,Math.max(0,r)),d=new Ea({uniforms:{uMap:{value:l},uOpacity:{value:u}},vertexShader:Gf,fragmentShader:qf,side:2,transparent:!0,depthWrite:!1}),f=new Ui(this.sharedGeometry,d);f.matrixAutoUpdate=!1,f.renderOrder=this.layers.length,f.visible=n,this.scene.add(f);let p=c===void 0?{r:!1,g:!1,b:!1,a:!1}:Ll(c);return{id:e,name:t,visible:n,opacity:u,width:a,height:o,transform:{...s},lockedChannels:p,buffer:i,texture:l,material:d,plane:f,renderTextureId:null}}refreshLayerStacking(){for(let e=0;e<this.layers.length;e+=1){let t=this.layers[e];t!==void 0&&(t.plane.renderOrder=e)}this.layoutSceneTransforms()}findLayer(e){for(let t of this.layers)if(t.id===e)return t;return null}activeLayer(){return this.findLayer(this.activeLayerId)}historyTextureFor(e){let t=this.textures.get(e);return t===void 0?null:{buffer:t.buffer,width:t.width}}resolveFrame(){let e=new Map;for(let[t,n]of this.textures)e.set(t,{width:n.width,height:n.height,buffer:n.buffer});let t=new Map;for(let[e,n]of this.contents)t.set(e,{textureId:n.textureId,transform:n.transform});return jd(this.layers.map(e=>e.id),e,t,this.cells,this.currentFrame)}syncLayerRender(e){let t=this.resolveFrame().get(e.id);if(t===void 0||t.textureId===null||t.buffer===null){e.buffer=new Uint8ClampedArray,e.width=0,e.height=0,e.transform={...yu},e.renderTextureId=null,e.plane.visible=!1;return}let n=t.textureId,r=e.texture.image;if(e.renderTextureId!==n||r.data!==t.buffer||r.width!==t.width||r.height!==t.height){e.texture.dispose();let n=new Ki(t.buffer,t.width,t.height);n.magFilter=Ee,n.minFilter=Ee,n.generateMipmaps=!1,n.flipY=!0,n.needsUpdate=!0,e.texture=n,e.material.uniforms.uMap.value=n}e.buffer=t.buffer,e.width=t.width,e.height=t.height,e.transform={...t.transform},e.renderTextureId=n,e.plane.visible=e.visible}syncAllLayerRenders(){for(let e of this.layers)this.syncLayerRender(e)}markTextureViewsDirty(e){for(let t of this.layers)t.renderTextureId===e&&(t.texture.needsUpdate=!0)}nextContentId(){return`content${this.contentCounter++}`}nextTextureId(){return`tex${this.textureCounter++}`}nextTextureName(){return`Texture ${this.textureNameCounter++}`}contentDisplaySize(e){if(e.textureId===null)return{width:0,height:0};let t=this.textures.get(e.textureId);return t===void 0?{width:0,height:0}:{width:t.width,height:t.height}}getFrameCount(){return this.frameCount}getCurrentFrame(){return this.currentFrame}setCurrentFrame(e){return!Number.isInteger(e)||e<0||e>=this.frameCount||e===this.currentFrame?!1:(this.currentFrame=e,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.emitStats(),this.updateSelectionOverlay(),this.onLayersChanged?.(),!0)}addFrame(){return this.insertFrame(this.frameCount)}insertFrame(e){if(!Number.isInteger(e)||e<0||e>this.frameCount)return-1;let t=`Frame ${this.frameNameCounter++}`;return this.cells=Sd(this.cells,e),this.frameDurations=Cd(this.frameDurations,e),this.frameNames=kd(this.frameNames,e,t),this.frameCount+=1,this.floating!==null&&this.floating.frame>=e&&(this.floating.frame+=1),this.currentFrame=e,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.emitStats(),this.updateSelectionOverlay(),this.onLayersChanged?.(),this.currentFrame}moveFrame(e,t){if(!Number.isInteger(e)||e<0||e>=this.frameCount||this.frameCount<=1)return!1;let n=(e+t+this.frameCount)%this.frameCount;return n!==e&&(this.cells=wd(this.cells,e,n),this.frameDurations=Td(this.frameDurations,e,n),this.frameNames=Ad(this.frameNames,e,n),this.floating!==null&&(this.floating.frame===e?this.floating.frame=n:this.floating.frame===n&&(this.floating.frame=e)),this.currentFrame=n,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.emitStats(),this.updateSelectionOverlay(),this.onLayersChanged?.(),!0)}removeFrame(e){if(this.frameCount<=1||!Number.isInteger(e)||e<0||e>=this.frameCount)return!1;let t=new Map;for(let[n,r]of this.cells){let i=n.lastIndexOf(`
`),a=n.slice(0,i),o=Number.parseInt(n.slice(i+1),10);if(o===e)continue;let s=o>e?o-1:o;t.set(_d(a,s),r)}this.cells=t;let n=new Map;for(let[t,r]of this.frameDurations)t!==e&&n.set(t>e?t-1:t,r);return this.frameDurations=n,this.frameNames=[...this.frameNames.slice(0,e),...this.frameNames.slice(e+1)],--this.frameCount,this.floating!==null&&(this.floating.frame===e?this.dropFloating():this.floating.frame>e&&--this.floating.frame),this.currentFrame>e?--this.currentFrame:this.currentFrame>=this.frameCount&&(this.currentFrame=this.frameCount-1),this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.emitStats(),this.updateSelectionOverlay(),this.onLayersChanged?.(),!0}getFrameName(e){return!Number.isInteger(e)||e<0||e>=this.frameCount?Ed(e):this.frameNames[e]??Ed(e)}getFrameNames(){return[...this.frameNames]}renameFrame(e,t){if(!Number.isInteger(e)||e<0||e>=this.frameCount)return!1;let n=Dd(t);return n===null||this.frameNames[e]===n?!1:(this.frameNames[e]=n,this.emitStats(),this.onLayersChanged?.(),!0)}getFrameDuration(e){return!Number.isInteger(e)||e<0||e>=this.frameCount?null:this.frameDurations.get(e)??null}getDefaultFrameDuration(){return this.defaultFrameDuration}getEffectiveFrameDuration(e){return bd(this.getFrameDuration(e),this.defaultFrameDuration)}setFrameDuration(e,t){if(!Number.isInteger(e)||e<0||e>=this.frameCount)return!1;if(t===null)return this.frameDurations.has(e)?(this.frameDurations.delete(e),this.onLayersChanged?.(),this.emitStats(),!0):!1;if(!Number.isFinite(t))return!1;let n=yd(t);return this.frameDurations.get(e)!==n&&(this.frameDurations.set(e,n),this.onLayersChanged?.(),this.emitStats(),!0)}setDefaultFrameDuration(e){if(!Number.isFinite(e))return!1;let t=yd(e);return t!==this.defaultFrameDuration&&(this.defaultFrameDuration=t,this.onLayersChanged?.(),this.emitStats(),!0)}getCellContentId(e,t){return this.cells.get(_d(e,t))??null}getCellTextureId(e,t){let n=this.cells.get(_d(e,t));if(n===void 0)return null;let r=this.contents.get(n);return r===void 0||r.textureId===null?null:this.textures.has(r.textureId)?r.textureId:null}getAnimationMatrix(){let e=[...this.layers].reverse().map(e=>({layerId:e.id,layerName:e.name,cells:Array.from({length:this.frameCount},(t,n)=>{let r=this.cells.get(_d(e.id,n))??null,i=r===null?void 0:this.contents.get(r);return{layerId:e.id,frame:n,contentId:r,contentName:i?.name??null,hasTexture:i?.textureId!==void 0&&i.textureId!==null&&this.textures.has(i.textureId)}})}));return{frameCount:this.frameCount,currentFrame:this.currentFrame,activeLayerId:this.activeLayerId,frameNames:[...this.frameNames],rows:e,contents:[...this.contents.values()].map(e=>{let t=this.contentDisplaySize(e);return{id:e.id,name:e.name,textureId:e.textureId,width:t.width,height:t.height,transform:{...e.transform}}}),textures:[...this.textures.values()].map(e=>({id:e.id,name:e.name,width:e.width,height:e.height}))}}createCellContent(e,t){if(this.findLayer(e)===null||!Number.isInteger(t)||t<0||t>=this.frameCount)return null;let n=this.nextTextureId();this.textures.set(n,{id:n,name:this.nextTextureName(),width:this.imageWidth,height:this.imageHeight,buffer:Bl(this.imageWidth,this.imageHeight)});let r=this.nextContentId();return this.contents.set(r,{id:r,name:`Content ${this.contentCounter-1}`,textureId:n,transform:{...yu}}),this.cells.set(_d(e,t),r),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),r}createEmptyContentForCell(e,t){if(this.findLayer(e)===null||!Number.isInteger(t)||t<0||t>=this.frameCount)return null;let n=this.nextContentId();return this.contents.set(n,{id:n,name:`Content ${this.contentCounter-1}`,textureId:null,transform:{...yu}}),this.cells.set(_d(e,t),n),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),n}createEmptyTexture(){let e=this.nextTextureId();return this.textures.set(e,{id:e,name:this.nextTextureName(),width:this.imageWidth,height:this.imageHeight,buffer:Bl(this.imageWidth,this.imageHeight)}),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),e}dissociateCellContent(e,t){let n=_d(e,t);return this.cells.has(n)?(this.cells.delete(n),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0):!1}associateCellContent(e,t,n){if(this.findLayer(e)===null||!this.contents.has(n)||!Number.isInteger(t)||t<0||t>=this.frameCount)return!1;let r=_d(e,t);return this.cells.get(r)!==n&&(this.cells.set(r,n),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0)}dissociateContentTexture(e){let t=this.contents.get(e);return t===void 0||t.textureId===null?!1:(t.textureId=null,this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0)}associateContentTexture(e,t){let n=this.contents.get(e);return n===void 0||!this.textures.has(t)||n.textureId===t?!1:(n.textureId=t,this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0)}ensureCellContent(e,t){if(this.findLayer(e)===null)return null;let n=_d(e,t),r=this.cells.get(n),i=r===void 0?void 0:this.contents.get(r);if(i===void 0){let e=this.nextContentId();i={id:e,name:`Content ${this.contentCounter-1}`,textureId:null,transform:{...yu}},this.contents.set(e,i),this.cells.set(n,e),r=e}let a=i.textureId===null?null:this.textures.get(i.textureId)??null;if(a===null){let e=this.nextTextureId();a={id:e,name:this.nextTextureName(),width:this.imageWidth,height:this.imageHeight,buffer:Bl(this.imageWidth,this.imageHeight)},this.textures.set(e,a),i.textureId=e}return{content:i,texture:a}}exportTextures(){return[...this.textures.values()].map(e=>({id:e.id,width:e.width,height:e.height,buffer:e.buffer}))}exportAnimationProject(){return{layers:this.layers.map(e=>({id:e.id,name:e.name,visible:e.visible,opacity:e.opacity,lockedChannels:{...e.lockedChannels}})),textures:[...this.textures.values()].map(e=>({id:e.id,name:e.name,width:e.width,height:e.height,buffer:e.buffer})),contents:[...this.contents.values()].map(e=>({id:e.id,name:e.name,textureId:e.textureId,transform:{...e.transform}})),cells:[...this.cells.entries()].map(([e,t])=>{let n=e.lastIndexOf(`
`);return{layer:e.slice(0,n),frame:Number.parseInt(e.slice(n+1),10),content:t}}),frames:this.frameCount,currentFrame:this.currentFrame,defaultFrameDuration:this.defaultFrameDuration,frameDurations:[...this.frameDurations.entries()].map(([e,t])=>({frame:e,duration:t})),frameNames:[...this.frameNames]}}getLayers(){return this.layers.map(e=>({id:e.id,name:e.name,visible:e.visible,opacity:e.opacity,width:e.width,height:e.height,transform:{...e.transform},lockedChannels:{...e.lockedChannels}}))}getActiveLayerId(){return this.activeLayerId}setActiveLayer(e){return this.findLayer(e)!==null&&(this.activeLayerId=e,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.updateGrid(),this.updateAxisOverlay(),this.render(),this.updatePreviews(),this.emitStats(),!0)}addLayer(){return this.insertLayerAt(this.layers.length)}insertLayerAboveActive(){let e=this.layers.findIndex(e=>e.id===this.activeLayerId),t=e<0?this.layers.length:e+1;return this.insertLayerAt(t)}insertLayerAbove(e){let t=this.layers.findIndex(t=>t.id===e);return t<0?null:this.insertLayerAt(t+1)}insertLayerBelow(e){let t=this.layers.findIndex(t=>t.id===e);return t<0?null:this.insertLayerAt(t)}insertLayerAt(e){let t=`layer${this.layerCounter}`,n=`Layer ${this.layerCounter+1}`;this.layerCounter+=1;let r=this.createLayerInternal(t,n,!0,1,Bl(this.imageWidth,this.imageHeight),this.imageWidth,this.imageHeight,{...yu}),i=Math.min(Math.max(0,Math.floor(e)),this.layers.length);return this.layers.splice(i,0,r),this.textures.set(t,{id:t,name:this.nextTextureName(),width:this.imageWidth,height:this.imageHeight,buffer:r.buffer}),this.activeLayerId=t,this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),t}removeLayer(e){return this.layers.length<=1||!this.removeLayerFull(e)?!1:(this.refreshLayerStacking(),this.render(),this.emitStats(),!0)}removeLayerFull(e){if(this.floating!==null&&(this.floating.layerId===e||this.floating.textureId===e)&&this.dropFloating(),!this.removeLayerSilent(e))return!1;for(let t of this.contents.values())t.textureId===e&&(t.textureId=null);for(let t of[...this.cells.keys()])t.startsWith(`${e}\n`)&&this.cells.delete(t);return this.syncAllLayerRenders(),!0}removeLayerSilent(e){let t=this.layers.findIndex(t=>t.id===e);if(t<0)return!1;let[n]=this.layers.splice(t,1);if(n!==void 0&&(this.scene.remove(n.plane),n.material.dispose(),n.texture.dispose()),this.textures.delete(e),this.activeLayerId===e){let e=this.layers[Math.min(t,this.layers.length-1)];e!==void 0&&(this.activeLayerId=e.id)}return!0}insertLayerSnapshot(e){let t=new Uint8ClampedArray(e.buffer),n=this.createLayerInternal(e.id,e.name,e.visible,e.opacity,t,e.width,e.height,{...yu},{...e.lockedChannels});this.textures.set(e.id,{id:e.id,name:e.textureName,width:e.width,height:e.height,buffer:t}),n.renderTextureId=e.id;let r=Math.min(Math.max(0,e.stackIndex),this.layers.length);this.layers.splice(r,0,n);for(let t of e.cells)this.contents.has(t.content)&&this.cells.set(_d(e.id,t.frame),t.content);for(let t of e.detachedContents){let n=this.contents.get(t);n!==void 0&&(n.textureId=e.id)}this.activeLayerId=e.id,this.syncAllLayerRenders(),this.refreshLayerStacking()}mergeDown(e){let t=this.layers.findIndex(t=>t.id===e);if(t<=0)return!1;let n=this.layers[t],r=this.layers[t-1];if(n===void 0||r===void 0)return!1;let i=this.currentFrame,a=_d(e,i),o=this.cells.get(a)??null,s=o===null?void 0:this.contents.get(o),c=s?.textureId??null,l=c===null?void 0:this.textures.get(c),u=this.textures.get(e);if(o===null||s===void 0||c===null||l===void 0||u===void 0)return!1;let d=_d(r.id,i),f=this.cells.get(d)??null,p=f===null?void 0:this.contents.get(f),m=p?.textureId??null;if(this.floating!==null&&this.floating.active&&(this.floating.textureId===c||this.floating.textureId===m)&&this.commitFloating(),m===null)return this.mergeDownRelink(t,e,r.id,i,a,o,c,d,p);let h=this.textures.get(m);if(h===void 0)return this.mergeDownRelink(t,e,r.id,i,a,o,c,d,p);let g=h.buffer.slice();for(let e=0;e<h.height;e+=1)for(let t=0;t<h.width;t+=1){let i=wu(t,e,h.width,h.height,r.transform),a=Tu(i.x,i.y,l.width,l.height,n.transform);a!==null&&fu(h.buffer,(e*h.width+t)*4,l.buffer,(a.y*l.width+a.x)*4,n.opacity,r.lockedChannels)}let _=zf(g,h.buffer,h.width,h.height),v=m,y=this.mergeDownKeepsLayer(e),b={id:n.id,name:n.name,textureName:u.name,visible:n.visible,opacity:n.opacity,width:u.width,height:u.height,transform:{...n.transform},lockedChannels:{...n.lockedChannels},stackIndex:t,buffer:u.buffer.slice(),cells:[],detachedContents:[]};if(y)this.cells.delete(a),this.activeLayerId=r.id,this.pushHistory({type:`merge`,merge:{lowerLayerId:v,lowerDiff:_,upper:b,removedLayer:!1,dissociatedCell:{layer:e,frame:this.currentFrame,content:o},associatedCell:null,textureLink:null}});else{let t=this.collectMergeSnapshotCells(e);b.cells=t.cells,b.detachedContents=t.detachedContents,this.removeLayerFull(e),this.activeLayerId=r.id,this.pushHistory({type:`merge`,merge:{lowerLayerId:v,lowerDiff:_,upper:b,removedLayer:!0,dissociatedCell:null,associatedCell:null,textureLink:null}})}return this.markTextureViewsDirty(v),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0}mergeDownKeepsLayer(e){for(let t=0;t<this.frameCount;t+=1){if(t===this.currentFrame)continue;let n=this.cells.get(_d(e,t));if(n===void 0)continue;let r=this.contents.get(n);if(r!==void 0&&r.textureId!==null&&this.textures.has(r.textureId))return!0}return!1}collectMergeSnapshotCells(e){let t=[];for(let[n,r]of this.cells)if(n.startsWith(`${e}\n`)){let e=n.lastIndexOf(`
`);t.push({frame:Number.parseInt(n.slice(e+1),10),content:r})}let n=[];for(let t of this.contents.values())t.textureId===e&&n.push(t.id);return{cells:t,detachedContents:n}}mergeDownRelink(e,t,n,r,i,a,o,s,c){let l=this.findLayer(t),u=this.findLayer(n),d=this.textures.get(t);if(l===null||u===null||d===void 0)return!1;let f={id:l.id,name:l.name,textureName:d.name,visible:l.visible,opacity:l.opacity,width:d.width,height:d.height,transform:{...l.transform},lockedChannels:{...l.lockedChannels},stackIndex:e,buffer:d.buffer.slice(),cells:[],detachedContents:[]},p=null,m=null;if(c===void 0)this.cells.set(s,a),p={layer:n,frame:r,content:a};else{let e=c.textureId;c.textureId=o,m={contentId:c.id,before:e,after:o}}if(this.mergeDownKeepsLayer(t))this.cells.delete(i),this.activeLayerId=n,this.pushHistory({type:`merge`,merge:{lowerLayerId:n,lowerDiff:null,upper:f,removedLayer:!1,dissociatedCell:{layer:t,frame:r,content:a},associatedCell:p,textureLink:m}});else{let e=this.collectMergeSnapshotCells(t);f.cells=e.cells,f.detachedContents=e.detachedContents,this.removeLayerFull(t),this.activeLayerId=n,this.pushHistory({type:`merge`,merge:{lowerLayerId:n,lowerDiff:null,upper:f,removedLayer:!0,dissociatedCell:null,associatedCell:p,textureLink:m}})}return this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0}setContentTextureForHistory(e,t){let n=this.contents.get(e);return n===void 0||t!==null&&!this.textures.has(t)?!1:(n.textureId=t,this.syncAllLayerRenders(),!0)}associateCellForHistory(e,t,n){return this.findLayer(e)===null||!this.contents.has(n)||!Number.isInteger(t)||t<0||t>=this.frameCount?!1:(this.cells.set(_d(e,t),n),this.syncAllLayerRenders(),!0)}dissociateCellForHistory(e,t){let n=_d(e,t);return this.cells.has(n)?(this.cells.delete(n),this.syncAllLayerRenders(),!0):!1}renameLayer(e,t){let n=this.findLayer(e),r=t.trim().slice(0,64);return n===null||r.length===0?!1:(n.name=r,this.emitStats(),this.onLayersChanged?.(),!0)}setLayerVisible(e,t){let n=this.findLayer(e);return n!==null&&(n.visible=t,n.plane.visible=t,this.render(),this.emitStats(),!0)}setLayerOpacity(e,t){let n=this.findLayer(e);if(n===null)return!1;let r=Math.min(1,Math.max(0,t));return n.opacity=r,n.material.uniforms.uOpacity.value=r,this.render(),!0}setLayerLockedChannels(e,t){let n=this.findLayer(e);return n!==null&&(n.lockedChannels=Ll(t),this.emitStats(),!0)}setLayerChannelLocked(e,t,n){let r=this.findLayer(e);return r!==null&&(r.lockedChannels[t]=n===!0,this.emitStats(),!0)}moveLayer(e,t){let n=this.layers.findIndex(t=>t.id===e),r=t===`up`?n+1:n-1;if(n<0||r<0||r>=this.layers.length)return!1;let i=this.layers[n],a=this.layers[r];return i===void 0||a===void 0?!1:(this.layers[r]=i,this.layers[n]=a,this.refreshLayerStacking(),this.render(),this.emitStats(),!0)}moveLayerWrapping(e,t){let n=this.layers.findIndex(t=>t.id===e);if(n<0||this.layers.length<=1)return!1;let r=t===`up`?n+1:n-1;if(r>=0&&r<this.layers.length)return this.moveLayer(e,t);let[i]=this.layers.splice(n,1);return i!==void 0&&(this.layers.splice(t===`up`?0:this.layers.length,0,i),this.refreshLayerStacking(),this.render(),this.emitStats(),!0)}exportLayers(){return this.layers.map(e=>({id:e.id,width:e.width,height:e.height,buffer:e.buffer}))}setLayerTransform(e,t){this.floating!==null&&this.floating.active&&this.floating.layerId===e&&this.floating.frame===this.currentFrame&&this.commitFloating();let n=this.ensureCellContent(e,this.currentFrame);if(n===null)return!1;if(t.x!==void 0&&(n.content.transform.x=t.x),t.y!==void 0&&(n.content.transform.y=t.y),t.rotation!==void 0&&(n.content.transform.rotation=ju(t.rotation)),t.rotationX!==void 0){let e=Number.isFinite(t.rotationX)?t.rotationX:0;n.content.transform.rotationX=ju(e)}if(t.rotationY!==void 0){let e=Number.isFinite(t.rotationY)?t.rotationY:0;n.content.transform.rotationY=ju(e)}if(t.flipX!==void 0&&(n.content.transform.flipX=t.flipX),t.flipY!==void 0&&(n.content.transform.flipY=t.flipY),t.scaleX!==void 0||t.scaleY!==void 0){let r=this.findLayer(e),i=r===null?64:Math.max(1,r.width),a=r===null?64:Math.max(1,r.height);if(t.scaleX!==void 0){let e=Number.isFinite(t.scaleX)?t.scaleX:0;n.content.transform.scaleX=Math.min(1024/i,Math.max(1/i,e))}if(t.scaleY!==void 0){let e=Number.isFinite(t.scaleY)?t.scaleY:0;n.content.transform.scaleY=Math.min(1024/a,Math.max(1/a,e))}}if(t.skewX!==void 0){let e=Number.isFinite(t.skewX)?t.skewX:0;n.content.transform.skewX=Math.min(2,Math.max(-2,e))}if(t.skewY!==void 0){let e=Number.isFinite(t.skewY)?t.skewY:0;n.content.transform.skewY=Math.min(2,Math.max(-2,e))}return this.syncAllLayerRenders(),this.layoutSceneTransforms(),this.render(),this.updatePreviews(),this.onTransformChanged?.(),!0}resetLayerTransform(e){this.floating!==null&&this.floating.active&&this.floating.layerId===e&&this.floating.frame===this.currentFrame&&this.commitFloating();let t=this.ensureCellContent(e,this.currentFrame);return t!==null&&(t.content.transform={...yu},this.syncAllLayerRenders(),this.layoutSceneTransforms(),this.render(),this.updatePreviews(),this.emitStats(),this.onTransformChanged?.(),!0)}setTexturePixels(e,t,n,r){let i=this.textures.get(e);return i===void 0||!Number.isInteger(t)||!Number.isInteger(n)||t<1||n<1||r.length!==t*n*4?!1:(i.width=t,i.height=n,i.buffer=r,this.syncAllLayerRenders(),!0)}applyLayerResize(e,t,n,r){let i=new Uint8ClampedArray(r);return!!this.setTexturePixels(e,t,n,i)}resizeLayer(e,t,n){let r=this.textures.get(e);if(r===void 0||!Number.isFinite(t)||!Number.isFinite(n))return!1;let i=Hl(t),a=Hl(n);if(i===r.width&&a===r.height)return!1;this.commitFloatingIfHomeTexture(e);let o=r.width,s=r.height,c=r.buffer.slice(),l=Ul(r.buffer,r.width,r.height,i,a),u=l.slice();return this.setTexturePixels(e,i,a,l)?(this.pushHistory({type:`resize`,resize:{layerId:e,beforeWidth:o,beforeHeight:s,beforeBuffer:c,afterWidth:i,afterHeight:a,afterBuffer:u}}),this.markTextureViewsDirty(e),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0):!1}fitTextureToSize(e,t){let n=this.textures.get(e);if(n===void 0)return!1;this.commitFloatingIfHomeTexture(e);let r=Number.isFinite(t)?Math.min(254,Math.max(0,Math.floor(t))):0,i=Wl(n.buffer,n.width,n.height,r);return i===null||i.left===0&&i.top===0&&i.width===n.width&&i.height===n.height?!1:this.applyTextureCropBox(e,n,i)}cropCellTextureToCanvas(e,t){let n=this.cells.get(_d(e,t)),r=n===void 0?void 0:this.contents.get(n),i=r?.textureId??null,a=i===null?void 0:this.textures.get(i);if(a===void 0||i===null||r===void 0)return`unchanged`;this.commitFloatingIfHomeTexture(i);let o=Mu(this.imageWidth,this.imageHeight,a.width,a.height,r.transform);return o===null?`outside`:o.left===0&&o.top===0&&o.width===a.width&&o.height===a.height?`unchanged`:this.applyTextureCropBox(i,a,o)?`cropped`:`unchanged`}applyTextureCropBox(e,t,n){let r=t.width,i=t.height,a=t.buffer.slice(),o=new Uint8ClampedArray(n.width*n.height*4);for(let e=0;e<n.height;e+=1){let i=((n.top+e)*r+n.left)*4;o.set(t.buffer.subarray(i,i+n.width*4),e*n.width*4)}let s=[...this.contents.values()].filter(t=>t.textureId===e).map(e=>({contentId:e.id,before:{...e.transform},after:Wf(e.transform,r,i,n)}));if(!this.setTexturePixels(e,n.width,n.height,o))return!1;for(let e of s){let t=this.contents.get(e.contentId);t!==void 0&&(t.transform={...e.after})}return this.pushHistory({type:`fit`,fit:{textureId:e,beforeWidth:r,beforeHeight:i,beforeBuffer:a,afterWidth:n.width,afterHeight:n.height,afterBuffer:o.slice(),transforms:s}}),this.markTextureViewsDirty(e),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0}applyFitToSize(e,t,n,r,i){let a=new Uint8ClampedArray(r);if(!this.setTexturePixels(e,t,n,a))return!1;for(let e of i){let t=this.contents.get(e.contentId);t!==void 0&&(t.transform={...e.transform})}return this.syncAllLayerRenders(),!0}loadProject(e,t,n){if(n.length===0)throw Error(`Project has no layers.`);for(let e of n){if(!Number.isInteger(e.width)||!Number.isInteger(e.height)||e.width<1||e.height<1)throw Error(`Layer has invalid dimensions: ${e.id}`);if(e.buffer.length!==e.width*e.height*4)throw Error(`Layer buffer size mismatch: ${e.id}`)}this.imageWidth=Math.max(1,Math.floor(e)),this.imageHeight=Math.max(1,Math.floor(t)),this.clearAllLayers();let r=0;this.textureNameCounter=1;for(let e of n){let t=/^layer(\d+)$/.exec(e.id);t!==null&&t[1]!==void 0&&(r=Math.max(r,Number.parseInt(t[1],10)+1));let n=new Uint8ClampedArray(e.buffer),i=this.createLayerInternal(e.id,e.name,e.visible,e.opacity,n,e.width,e.height,{...e.transform,rotation:ju(e.transform.rotation)},Ll(e.lockedChannels));this.layers.push(i),this.textures.set(e.id,{id:e.id,name:this.nextTextureName(),width:e.width,height:e.height,buffer:n}),i.renderTextureId=e.id;let a=this.nextContentId();this.contents.set(a,{id:a,name:`Content ${this.contentCounter-1}`,textureId:e.id,transform:{...e.transform,rotation:ju(e.transform.rotation)}}),this.cells.set(_d(e.id,0),a)}let i=this.layers[this.layers.length-1];i!==void 0&&(this.activeLayerId=i.id),this.layerCounter=Math.max(r,this.layers.length),this.frameCount=1,this.currentFrame=0,this.frameNames=[Ed(0)],this.frameNameCounter=2,this.history.clear(),this.dropFloating(),this.strokeBase=null,this.strokeLayerId=null,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncImageUniforms(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.resetView(),this.render(),this.emitStats(),this.onLayersChanged?.()}loadAnimationProject(e,t,n){if(n.layers.length===0)throw Error(`Project has no layers.`);if(!Number.isInteger(n.frames)||n.frames<1)throw Error(`Project has an invalid frame count.`);let r=new Set(n.layers.map(e=>e.id));for(let e of n.textures)if(e.buffer.length!==e.width*e.height*4)throw Error(`Texture buffer size mismatch: ${e.id}`);let i=new Set(n.textures.map(e=>e.id)),a=new Set;for(let e of n.contents)if(a.add(e.id),e.textureId!==null&&!i.has(e.textureId))throw Error(`Content references a missing texture: ${e.id}`);for(let e of n.cells){if(!r.has(e.layer))throw Error(`Cell references a missing layer: ${e.layer}`);if(!Number.isInteger(e.frame)||e.frame<0||e.frame>=n.frames)throw Error(`Cell references an invalid frame.`);if(!a.has(e.content))throw Error(`Cell references a missing content.`)}this.imageWidth=Math.max(1,Math.floor(e)),this.imageHeight=Math.max(1,Math.floor(t)),this.clearAllLayers();for(let e of n.layers){let t=new Uint8ClampedArray(4);this.layers.push(this.createLayerInternal(e.id,e.name,e.visible,e.opacity,t,1,1,{...yu},Ll(e.lockedChannels)))}for(let e of n.textures)this.textures.set(e.id,{id:e.id,name:e.name,width:e.width,height:e.height,buffer:new Uint8ClampedArray(e.buffer)});for(let e of n.contents)this.contents.set(e.id,{id:e.id,name:e.name,textureId:e.textureId,transform:{...e.transform,rotation:ju(e.transform.rotation)}});for(let e of n.cells)this.cells.set(_d(e.layer,e.frame),e.content);this.frameCount=n.frames,this.currentFrame=Math.min(Math.max(0,Math.floor(n.currentFrame)),n.frames-1),this.defaultFrameDuration=yd(n.defaultFrameDuration??100),this.frameNames=Od(n.frames,n.frameNames??[]),this.frameNameCounter=n.frames+1;for(let e of this.frameNames){let t=/^Frame (\d+)$/.exec(e);t?.[1]!==void 0&&(this.frameNameCounter=Math.max(this.frameNameCounter,Number.parseInt(t[1],10)+1))}this.frameDurations=new Map;for(let e of n.frameDurations??[])Number.isInteger(e.frame)&&e.frame>=0&&e.frame<n.frames&&Number.isFinite(e.duration)&&this.frameDurations.set(e.frame,yd(e.duration));let o=0,s=0,c=0;for(let e of n.layers){let t=/^layer(\d+)$/.exec(e.id);t?.[1]!==void 0&&(o=Math.max(o,Number.parseInt(t[1],10)+1))}for(let e of n.contents){let t=/^content(\d+)$/.exec(e.id);t?.[1]!==void 0&&(s=Math.max(s,Number.parseInt(t[1],10)+1))}for(let e of n.textures){let t=/^tex(\d+)$/.exec(e.id);t?.[1]!==void 0&&(c=Math.max(c,Number.parseInt(t[1],10)+1))}let l=0;for(let e of n.textures){let t=/^Texture (\d+)$/.exec(e.name);t?.[1]!==void 0&&(l=Math.max(l,Number.parseInt(t[1],10)+1))}this.layerCounter=Math.max(o,n.layers.length),this.contentCounter=Math.max(s,n.contents.length+1,1),this.textureCounter=Math.max(c,1),this.textureNameCounter=Math.max(l,n.textures.length+1,1);let u=this.layers[this.layers.length-1];u!==void 0&&(this.activeLayerId=u.id),this.history.clear(),this.dropFloating(),this.strokeBase=null,this.strokeLayerId=null,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.syncImageUniforms(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.resetView(),this.render(),this.emitStats(),this.onLayersChanged?.()}syncImageUniforms(){let e=this.backgroundMaterial.uniforms.uImageW,t=this.backgroundMaterial.uniforms.uImageH;e!==void 0&&(e.value=this.imageWidth),t!==void 0&&(t.value=this.imageHeight)}clearAllLayers(){for(let e of this.layers)this.scene.remove(e.plane),e.material.dispose(),e.texture.dispose();this.layers=[],this.textures.clear(),this.contents.clear(),this.cells.clear(),this.lineAnchor=null,this.resetCurveState(),this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.hidePreviews(),this.frameDurations.clear(),this.defaultFrameDuration=100,this.frameNames=[Ed(0)],this.frameNameCounter=2}newProject(e,t){this.imageWidth=e,this.imageHeight=t,this.clearAllLayers(),this.textureNameCounter=1;let n=this.createLayerInternal(`layer0`,`Layer 1`,!0,1,Bl(e,t),e,t,{...yu});this.layers.push(n),this.textures.set(`layer0`,{id:`layer0`,name:this.nextTextureName(),width:e,height:t,buffer:n.buffer}),n.renderTextureId=`layer0`,this.contents.set(`content1`,{id:`content1`,name:`Content 1`,textureId:`layer0`,transform:{...yu}}),this.cells.set(_d(`layer0`,0),`content1`),this.activeLayerId=n.id,this.layerCounter=1,this.contentCounter=2,this.textureCounter=1,this.frameCount=1,this.currentFrame=0,this.frameNames=[Ed(0)],this.frameNameCounter=2,this.history.clear(),this.dropFloating(),this.strokeBase=null,this.strokeLayerId=null,this.syncImageUniforms(),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.resetView(),this.render(),this.emitStats(),this.onLayersChanged?.()}setColor(e){let t=pu(e);t!==null&&(this.color=t,this.updatePreviews())}getBlendMode(){return this.blendMode}setBlendMode(e){let t=Pl(e);return t!==this.blendMode&&(this.blendMode=t,t!==`eraser`&&(this.blendBeforeEraser=t),this.emitStats(),this.updatePreviews(),!0)}toggleEraserBlend(){return this.blendMode===`eraser`?this.blendMode=this.blendBeforeEraser:(this.blendBeforeEraser=this.blendMode,this.blendMode=`eraser`),this.emitStats(),this.updatePreviews(),this.blendMode}getAccumulate(){return this.accumulate}setAccumulate(e){let t=e===!0;return t!==this.accumulate&&(this.accumulate=t,this.emitStats(),!0)}getBrushSize(){return this.brushSize}getBrushShape(){return this.brushShape}setBrushSize(e){let t=Ql(e);return t!==this.brushSize&&(this.brushSize=t,this.emitStats(),this.updatePreviews(),!0)}setBrushShape(e){let t=eu(e);return t!==this.brushShape&&(this.brushShape=t,this.emitStats(),this.updatePreviews(),!0)}getPencilAntialias(){return this.pencilAntialias}setPencilAntialias(e){let t=e===!0;return t!==this.pencilAntialias&&(this.pencilAntialias=t,this.emitStats(),this.updatePreviews(),!0)}getPencilPixelPerfect(){return this.pencilPixelPerfect}getCurvePixelPerfect(){return this.curvePixelPerfect}setPencilPixelPerfect(e){let t=e===!0;return t!==this.pencilPixelPerfect&&(this.pencilPixelPerfect=t,this.emitStats(),this.updatePreviews(),!0)}setCurvePixelPerfect(e){let t=e===!0;return t!==this.curvePixelPerfect&&(this.curvePixelPerfect=t,this.emitStats(),this.updatePreviews(),!0)}pencilPixelPerfectActive(){return this.pencilPixelPerfect&&this.brushSize===1&&!this.pencilAntialias}curvePixelPerfectActive(){return this.curvePixelPerfect&&this.curveWidth===1&&!this.curveAntialias}resetPencilPixelPerfect(){this.pencilPixelPerfectStroke.reset()}getStabilizerMode(){return this.stabilizerMode}getRopeLength(){return this.ropeLength}getFollowStrength(){return this.followStrength}getStabilizerPos(){return this.stabilizerPos===null?null:{x:this.stabilizerPos.x,y:this.stabilizerPos.y}}setStabilizerMode(e){let t=Hu(e);return t!==this.stabilizerMode&&(this.stabilizerMode=t,t===`none`&&(this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop()),this.emitStats(),this.updatePreviews(),!0)}setRopeLength(e){let t=Uu(e);return t!==this.ropeLength&&(this.ropeLength=t,this.emitStats(),this.updatePreviews(),!0)}setFollowStrength(e){let t=Wu(e);return t!==this.followStrength&&(this.followStrength=t,this.emitStats(),this.updatePreviews(),!0)}isStabilizing(){return this.tool===`pencil`&&this.stabilizerMode!==`none`}stabilizerStep(e,t){return this.stabilizerMode===`rope`?Ku(e,t,this.ropeLength):this.stabilizerMode===`follow`?qu(e,t,this.followStrength):{x:t.x,y:t.y}}getLineWidth(){return this.lineWidth}getLineShape(){return this.lineShape}getLineAntialias(){return this.lineAntialias}setLineWidth(e){let t=Ql(e);return t!==this.lineWidth&&(this.lineWidth=t,this.emitStats(),this.updatePreviews(),!0)}setLineShape(e){let t=eu(e);return t!==this.lineShape&&(this.lineShape=t,this.emitStats(),this.updatePreviews(),!0)}setLineAntialias(e){let t=e===!0;return t!==this.lineAntialias&&(this.lineAntialias=t,this.emitStats(),this.updatePreviews(),!0)}getLineAnchor(){return this.lineAnchor===null?null:{x:this.lineAnchor.x,y:this.lineAnchor.y}}cancelLine(){return this.lineAnchor!==null&&(this.lineAnchor=null,this.updatePreviews(),!0)}getCurveWidth(){return this.curveWidth}getCurveShape(){return this.curveShape}getCurveAntialias(){return this.curveAntialias}setCurveWidth(e){let t=Ql(e);return t!==this.curveWidth&&(this.curveWidth=t,this.emitStats(),this.updatePreviews(),!0)}setCurveShape(e){let t=eu(e);return t!==this.curveShape&&(this.curveShape=t,this.emitStats(),this.updatePreviews(),!0)}setCurveAntialias(e){let t=e===!0;return t!==this.curveAntialias&&(this.curveAntialias=t,this.emitStats(),this.updatePreviews(),!0)}getCurvePhase(){return this.curvePhase}cancelCurve(){return this.curvePhase!==`idle`&&(this.curvePhase=`idle`,this.curveP0=null,this.curveP3=null,this.curveC1=null,this.curveDragCurrent=null,this.updatePreviews(),!0)}clientToLayerImageFloat(e,t){let n=this.activeLayer();if(n===null||n.width<1||n.height<1)return null;let r=this.renderer.domElement.getBoundingClientRect(),i=Du(e,t,{left:r.left,top:r.top,width:r.width,height:r.height},this.viewTransform());if(i===null)return null;let a=n.transform,o=Eu(i.x,i.y,n.width,n.height,a);return o===null?null:{x:o.x,y:o.y}}resetCurveState(){this.curvePhase=`idle`,this.curveP0=null,this.curveP3=null,this.curveC1=null,this.curveDragCurrent=null}repaintFromMask(e,t,n,r){e.buffer.set(t),du(e.buffer,n,e.width,e.height,this.color,this.blendMode,r)}paintPencilLine(e,t,n,r,i,a){if(this.pencilPixelPerfectActive()){let o=this.pencilPixelPerfectStroke,s=this.strokeBase,c=this.strokeMask;if(!this.accumulate&&s!==null&&c!==null){gu(n,r,i,a,(t,n)=>{if(o.add(t,n)){for(let t of o.drainRemoved())t.x>=0&&t.y>=0&&t.x<e.width&&t.y<e.height&&(c[t.y*e.width+t.x]=0);t<0||n<0||t>=e.width||n>=e.height||(c[n*e.width+t]=255)}}),this.repaintFromMask(e,s,c,t);return}if(this.accumulate&&s!==null){gu(n,r,i,a,(n,r)=>{if(o.add(n,r)){for(let t of o.drainRemoved())if(t.x>=0&&t.y>=0&&t.x<e.width&&t.y<e.height){let n=(t.y*e.width+t.x)*4;e.buffer[n]=s[n],e.buffer[n+1]=s[n+1],e.buffer[n+2]=s[n+2],e.buffer[n+3]=s[n+3]}Kl(e.buffer,e.width,e.height,n,r,this.color,t,this.blendMode)}});return}}!this.accumulate&&this.strokeBase!==null&&this.strokeMask!==null?(lu(this.strokeMask,e.width,e.height,n,r,i,a,this.brushSize,this.brushShape,this.pencilAntialias),this.repaintFromMask(e,this.strokeBase,this.strokeMask,t)):iu(e.buffer,e.width,e.height,n,r,i,a,this.brushSize,this.brushShape,this.pencilAntialias,this.color,t,this.blendMode)}paintPixelPerfectCurve(e,t,n,r,i,a,o){let s=new vu;if(this.accumulate)_u({p0:r,c1:i,c2:a,p3:o},(r,i)=>{if(s.add(r,i)){for(let t of s.drainRemoved())if(t.x>=0&&t.y>=0&&t.x<e.width&&t.y<e.height){let r=(t.y*e.width+t.x)*4;e.buffer[r]=n[r],e.buffer[r+1]=n[r+1],e.buffer[r+2]=n[r+2],e.buffer[r+3]=n[r+3]}Kl(e.buffer,e.width,e.height,r,i,this.color,t,this.blendMode)}});else{let c=new Uint8Array(e.width*e.height);_u({p0:r,c1:i,c2:a,p3:o},(t,n)=>{if(s.add(t,n)){for(let t of s.drainRemoved())t.x>=0&&t.y>=0&&t.x<e.width&&t.y<e.height&&(c[t.y*e.width+t.x]=0);t<0||n<0||t>=e.width||n>=e.height||(c[n*e.width+t]=255)}}),this.repaintFromMask(e,n,c,t)}}pushHistory(e){let t=this.history.push(e);this.floating!==null&&(this.floating.cutDepth=Math.max(0,this.floating.cutDepth-t)),this.floating!==null&&!this.floating.active&&(this.floating=null,this.syncFloatingPlane(),this.updatePreviews())}hasFloatingSelection(){return this.floating!==null&&this.floating.active}floatingPlacement(e){return{cx:e.cx,cy:e.cy,rotation:e.rotation,scaleX:e.scaleX,scaleY:e.scaleY,skewX:e.skewX,skewY:e.skewY,rotationX:e.rotationX,rotationY:e.rotationY,flipX:e.flipX,flipY:e.flipY,width:e.width,height:e.height}}getFloatingRect(){let e=this.floating;if(e===null||!e.active)return null;let t=Bu(this.floatingPlacement(e)),n=Math.floor(t.minX),r=Math.floor(t.minY);return{x:n,y:r,width:Math.ceil(t.maxX)-n,height:Math.ceil(t.maxY)-r}}getFloatingTransform(){let e=this.floating;return e===null||!e.active?null:{cx:e.cx,cy:e.cy,rotation:e.rotation,scaleX:e.scaleX,scaleY:e.scaleY,skewX:e.skewX,skewY:e.skewY,rotationX:e.rotationX,rotationY:e.rotationY,flipX:e.flipX,flipY:e.flipY,width:e.width,height:e.height}}resetFloatingRotations(){let e=this.floating;return e===null||!e.active?!1:(e.rotation=0,e.rotationX=0,e.rotationY=0,this.syncFloatingPlane(),this.render(),this.updatePreviews(),!0)}resetFloatingTransform(){let e=this.floating;return e===null||!e.active?!1:(e.cx=e.initial.cx,e.cy=e.initial.cy,e.rotation=e.initial.rotation,e.scaleX=e.initial.scaleX,e.scaleY=e.initial.scaleY,e.skewX=e.initial.skewX,e.skewY=e.initial.skewY,e.flipX=e.initial.flipX,e.flipY=e.initial.flipY,this.syncFloatingPlane(),this.render(),this.updatePreviews(),!0)}afterFloatingChange(){this.syncFloatingPlane(),this.render(),this.updatePreviews()}clientToSelectionLocal(e,t){let n=this.floating;if(n===null||!n.active||!this.floatingHomeVisible())return null;let r=this.clientToLayerImageFloat(e,t);return r===null?null:zu(this.floatingPlacement(n),r.x,r.y)}selectionHandleLayout(){let e=this.floating;if(e===null||!e.active||!this.floatingHomeVisible())return null;let t=this.activeLayer();if(t===null)return null;let n=this.renderer.domElement.getBoundingClientRect();if(n.width<=0||n.height<=0)return null;let r=this.floatingPlacement(e),i={left:0,top:0,width:n.width,height:n.height},a=this.viewTransform(),o=(e,n)=>{let o=Ru(r,e,n),s=Cu(o.x,o.y,t.width,t.height,t.transform),c=Ou(s.x,s.y,i,a);return{x:c.x,y:c.y}},s=e.width/2,c=e.height/2,l=o(s,c),u=[{id:`resize-nw`,bx:0,by:0},{id:`resize-ne`,bx:e.width,by:0},{id:`resize-se`,bx:e.width,by:e.height},{id:`resize-sw`,bx:0,by:e.height}],d=[{id:`resize-n`,bx:s,by:0},{id:`resize-s`,bx:s,by:e.height},{id:`resize-e`,bx:e.width,by:c},{id:`resize-w`,bx:0,by:c}];return this.placeBoxHandles(l,u.map(e=>({id:e.id,point:o(e.bx,e.by)})),d.map(e=>({id:e.id,point:o(e.bx,e.by)})))}placeBoxHandles(e,t,n){let r=[],i=t=>{let n=t.x-e.x,r=t.y-e.y,i=Math.sqrt(n*n+r*r);return i>1e-6?{nx:n/i,ny:r/i}:{nx:0,ny:-1}};for(let e of t){r.push({id:e.id,kind:`resize`,x:e.point.x,y:e.point.y,angle:0});let{nx:t,ny:n}=i(e.point);r.push({id:e.id.replace(`resize-`,`rotate-`),kind:`rotate`,x:e.point.x+t*20,y:e.point.y+n*20,angle:Math.atan2(n,t)*180/Math.PI-225})}for(let e of n){r.push({id:e.id,kind:`resize`,x:e.point.x,y:e.point.y,angle:0});let{nx:t,ny:n}=i(e.point),a=e.id===`resize-e`||e.id===`resize-w`;r.push({id:e.id.replace(`resize-`,`skew-`),kind:`skew`,x:e.point.x+t*34,y:e.point.y+n*34,angle:a?90:0})}r.push({id:`center`,kind:`center`,x:e.x,y:e.y,angle:0});for(let t of[{id:`flip-n`,edgeId:`resize-n`,vertical:!1},{id:`flip-s`,edgeId:`resize-s`,vertical:!1},{id:`flip-e`,edgeId:`resize-e`,vertical:!0},{id:`flip-w`,edgeId:`resize-w`,vertical:!0}]){let n=r.find(e=>e.id===t.edgeId);if(n===void 0)continue;let{nx:a,ny:o}=i({x:n.x,y:n.y});r.push({id:t.id,kind:`flip`,x:e.x+a*26,y:e.y+o*26,angle:t.vertical?90:0})}return r}selectionHitTest(e,t){let n=this.selectionHandleLayout();if(n===null)return null;let r=this.renderer.domElement.getBoundingClientRect(),i=e-r.left,a=t-r.top;for(let e of[`rotate`,`skew`,`flip`,`resize`,`center`])for(let t of n){if(t.kind!==e)continue;let n=t.x-i,r=t.y-a;if(n*n+r*r<=144)return{kind:e,id:t.id}}return null}getSelectionHandles(){if(this.tool===`transform3d`||this.tool===`destransform3d`){let e=this.rot3DFrameFor(this.tool===`transform3d`?`layer`:`floating`);return e===null?[]:[...this.rot3DHandlePositions(e).map(e=>({id:e.id,x:e.x,y:e.y})),{id:`center`,x:e.center.x,y:e.center.y}]}return((this.tool===`destransform`?this.selectionHandleLayout():this.tool===`transform`?this.layerHandleLayout():null)??[]).map(e=>({id:e.id,x:e.x,y:e.y}))}beginSelectionGesture(e,t){let n=this.floating;if(n===null||!n.active)return!1;let r=this.clientToLayerImageFloat(t.clientX,t.clientY);if(r===null)return!1;if(e.kind===`center`)return this.centerTap={startClientX:t.clientX,startClientY:t.clientY,grabDX:r.x-n.cx,grabDY:r.y-n.cy},!0;if(e.kind===`flip`)return this.flipTap={axis:e.id===`flip-n`||e.id===`flip-s`?`x`:`y`,startClientX:t.clientX,startClientY:t.clientY},!0;if(e.kind===`rotate`){let e=this.activeLayer();if(e===null)return!1;let r=this.renderer.domElement.getBoundingClientRect(),i=Cu(n.cx,n.cy,e.width,e.height,e.transform),a=Ou(i.x,i.y,{left:r.left,top:r.top,width:r.width,height:r.height},this.viewTransform());return this.rotateDrag={startRotation:n.rotation,grabAngle:Math.atan2(t.clientY-a.y,t.clientX-a.x),centerX:a.x,centerY:a.y},!0}let i=this.floatingPlacement(n),a=zu(i,r.x,r.y);if(a===null)return!1;if(e.kind===`skew`){let r=e.id===`skew-n`||e.id===`skew-s`?`x`:`y`,i=this.selectionHandleLayout(),a=r===`x`?`resize-n`:`resize-e`,o=r===`x`?`resize-s`:`resize-w`,s=i?.find(e=>e.id===a),c=i?.find(e=>e.id===o);if(s===void 0||c===void 0)return!1;let l=c.x-s.x,u=c.y-s.y,d=Math.sqrt(l*l+u*u);if(!(d>1e-6))return!1;let f=this.floatingPlacement(n),p=Ru(f,n.width/2,n.height/2),m=this.activeLayer();if(m===null)return!1;let h=this.renderer.domElement.getBoundingClientRect(),g={left:0,top:0,width:h.width,height:h.height},_=this.viewTransform(),v=(e,t)=>{let n=Cu(e,t,m.width,m.height,m.transform);return Ou(n.x,n.y,g,_)},y=v(p.x,p.y),b=r===`x`?Ru(f,n.width/2+1,n.height/2):Ru(f,n.width/2,n.height/2+1),x=v(b.x,b.y),S=x.x-y.x,C=x.y-y.y,w=Math.sqrt(S*S+C*C);return w>1e-9&&(this.skewDrag={axis:r,sign:e.id===`skew-n`||e.id===`skew-w`?-1:1,startSkew:r===`x`?n.skewX:n.skewY,grabClientX:t.clientX,grabClientY:t.clientY,dirX:S/w,dirY:C/w,extent:d},!0)}let o={"resize-nw":{bx:n.width,by:n.height,axis:`both`},"resize-ne":{bx:0,by:n.height,axis:`both`},"resize-se":{bx:0,by:0,axis:`both`},"resize-sw":{bx:n.width,by:0,axis:`both`},"resize-n":{bx:n.width/2,by:n.height,axis:`y`},"resize-s":{bx:n.width/2,by:0,axis:`y`},"resize-e":{bx:0,by:n.height/2,axis:`x`},"resize-w":{bx:n.width,by:n.height/2,axis:`x`}}[e.id];if(o===void 0)return!1;let s=Ru(i,o.bx,o.by);return this.resizeDrag={anchorBufferX:o.bx,anchorBufferY:o.by,anchorHomeX:s.x,anchorHomeY:s.y,grabLocalX:a.x-n.width/2,grabLocalY:a.y-n.height/2,startScaleX:n.scaleX,startScaleY:n.scaleY,axis:o.axis,placement:{...this.floatingPlacement(n)}},!0}updateTransformGesture(e,t){let n=this.floating;if(n===null||!n.active||!this.floatingHomeVisible())this.resizeDrag=null,this.rotateDrag=null,this.skewDrag=null;else if(this.rotateDrag!==null){let r=this.rotateDrag,i=Math.atan2(t-r.centerY,e-r.centerX);n.rotation=ju(r.startRotation+(i-r.grabAngle)),this.lastMouseClient={x:e,y:t},this.afterFloatingChange()}else if(this.skewDrag!==null){let r=this.skewDrag,i=((e-r.grabClientX)*r.dirX+(t-r.grabClientY)*r.dirY)/r.extent,a=Math.min(2,Math.max(-2,r.startSkew+r.sign*i));r.axis===`x`?n.skewX=a:n.skewY=a,this.lastMouseClient={x:e,y:t},this.afterFloatingChange()}else if(this.resizeDrag!==null){let r=this.resizeDrag,i=this.clientToLayerImageFloat(e,t);if(i===null)return;let a=zu(r.placement,i.x,i.y);if(a===null)return;let o=n.width/2,s=n.height/2,c=r.anchorBufferX-o,l=r.anchorBufferY-s,u=r.startScaleX,d=r.startScaleY;if(r.axis!==`y`){let e=r.grabLocalX-c;Math.abs(e)>1e-9&&(u=r.startScaleX*(a.x-o-c)/e)}if(r.axis!==`x`){let e=r.grabLocalY-l;Math.abs(e)>1e-9&&(d=r.startScaleY*(a.y-s-l)/e)}u=Math.min(1024/n.width,Math.max(1/n.width,u)),d=Math.min(1024/n.height,Math.max(1/n.height,d)),n.scaleX=u,n.scaleY=d;let f=Pu({...r.placement,scaleX:u,scaleY:d});n.cx=r.anchorHomeX-(f.a*c+f.b*l),n.cy=r.anchorHomeY-(f.c*c+f.d*l),this.lastMouseClient={x:e,y:t},this.afterFloatingChange()}}layerHandleLayout(){let e=this.activeLayer();if(e===null||e.width<1||e.height<1)return null;let t=this.renderer.domElement.getBoundingClientRect();if(t.width<=0||t.height<=0)return null;let n={left:0,top:0,width:t.width,height:t.height},r=this.viewTransform(),i=(t,i)=>{let a=Cu(t,i,e.width,e.height,e.transform),o=Ou(a.x,a.y,n,r);return{x:o.x,y:o.y}},a=e.width/2,o=e.height/2;return this.placeBoxHandles(i(a,o),[{id:`resize-nw`,point:i(0,0)},{id:`resize-ne`,point:i(e.width,0)},{id:`resize-se`,point:i(e.width,e.height)},{id:`resize-sw`,point:i(0,e.height)}],[{id:`resize-n`,point:i(a,0)},{id:`resize-s`,point:i(a,e.height)},{id:`resize-e`,point:i(e.width,o)},{id:`resize-w`,point:i(0,o)}])}layerHitTest(e,t){let n=this.layerHandleLayout();if(n===null)return null;let r=this.renderer.domElement.getBoundingClientRect(),i=e-r.left,a=t-r.top;for(let e of[`rotate`,`skew`,`flip`,`resize`,`center`])for(let t of n){if(t.kind!==e)continue;let n=t.x-i,r=t.y-a;if(n*n+r*r<=144)return{kind:e,id:t.id}}return null}clientToProject(e,t){let n=this.renderer.domElement.getBoundingClientRect();return Du(e,t,{left:n.left,top:n.top,width:n.width,height:n.height},this.viewTransform())}beginLayerGesture(e,t){let n=this.activeLayer();if(n===null||n.width<1||n.height<1)return!1;if(e.kind===`center`)return this.layerCenterTap={layerId:n.id,startClientX:t.clientX,startClientY:t.clientY},!0;if(e.kind===`flip`)return this.layerFlipTap={layerId:n.id,axis:e.id===`flip-n`||e.id===`flip-s`?`x`:`y`,startClientX:t.clientX,startClientY:t.clientY},!0;if(e.kind===`rotate`){let e=this.renderer.domElement.getBoundingClientRect(),r=Ou(n.transform.x,n.transform.y,{left:e.left,top:e.top,width:e.width,height:e.height},this.viewTransform());return this.layerRotateDrag={layerId:n.id,startRotation:n.transform.rotation,grabAngle:Math.atan2(t.clientY-r.y,t.clientX-r.x),centerX:r.x,centerY:r.y},!0}let r={...n.transform},i=this.clientToProject(t.clientX,t.clientY);if(i===null)return!1;let a=Eu(i.x,i.y,n.width,n.height,r);if(a===null)return!1;if(e.kind===`skew`){let i=e.id===`skew-n`||e.id===`skew-s`?`x`:`y`,a=this.layerHandleLayout(),o=i===`x`?`resize-n`:`resize-e`,s=i===`x`?`resize-s`:`resize-w`,c=a?.find(e=>e.id===o),l=a?.find(e=>e.id===s);if(c===void 0||l===void 0)return!1;let u=l.x-c.x,d=l.y-c.y,f=Math.sqrt(u*u+d*d);if(!(f>1e-6))return!1;let p=this.renderer.domElement.getBoundingClientRect(),m={left:0,top:0,width:p.width,height:p.height},h=this.viewTransform(),g=(e,t)=>{let i=Cu(e,t,n.width,n.height,r);return Ou(i.x,i.y,m,h)},_=n.width/2,v=n.height/2,y=g(_,v),b=i===`x`?g(_+1,v):g(_,v+1),x=b.x-y.x,S=b.y-y.y,C=Math.sqrt(x*x+S*S);return C>1e-9&&(this.layerSkewDrag={layerId:n.id,axis:i,sign:e.id===`skew-n`||e.id===`skew-w`?-1:1,startSkew:i===`x`?r.skewX:r.skewY,grabClientX:t.clientX,grabClientY:t.clientY,dirX:x/C,dirY:S/C,extent:f,snapshot:r},!0)}let o={"resize-nw":{ix:n.width,iy:n.height,axis:`both`},"resize-ne":{ix:0,iy:n.height,axis:`both`},"resize-se":{ix:0,iy:0,axis:`both`},"resize-sw":{ix:n.width,iy:0,axis:`both`},"resize-n":{ix:n.width/2,iy:n.height,axis:`y`},"resize-s":{ix:n.width/2,iy:0,axis:`y`},"resize-e":{ix:0,iy:n.height/2,axis:`x`},"resize-w":{ix:n.width,iy:n.height/2,axis:`x`}}[e.id];if(o===void 0)return!1;let s=Cu(o.ix,o.iy,n.width,n.height,r);return this.layerResizeDrag={layerId:n.id,anchorImgX:o.ix,anchorImgY:o.iy,anchorProjectX:s.x,anchorProjectY:s.y,grabLocalX:a.x-n.width/2,grabLocalY:a.y-n.height/2,startScaleX:r.scaleX,startScaleY:r.scaleY,axis:o.axis,snapshot:r},!0}updateLayerGesture(e,t){let n=this.activeLayer();if(this.layerRotateDrag!==null){let r=this.layerRotateDrag;if(n===null||n.id!==r.layerId){this.layerRotateDrag=null;return}let i=Math.atan2(t-r.centerY,e-r.centerX);this.setLayerTransform(n.id,{rotation:r.startRotation+(i-r.grabAngle)}),this.lastMouseClient={x:e,y:t}}else if(this.layerSkewDrag!==null){let r=this.layerSkewDrag;if(n===null||n.id!==r.layerId){this.layerSkewDrag=null;return}let i=((e-r.grabClientX)*r.dirX+(t-r.grabClientY)*r.dirY)/r.extent,a=Math.min(2,Math.max(-2,r.startSkew+r.sign*i));this.setLayerTransform(n.id,r.axis===`x`?{skewX:a}:{skewY:a}),this.lastMouseClient={x:e,y:t}}else if(this.layerResizeDrag!==null){let r=this.layerResizeDrag;if(n===null||n.id!==r.layerId){this.layerResizeDrag=null;return}let i=this.clientToProject(e,t);if(i===null)return;let a=Eu(i.x,i.y,n.width,n.height,r.snapshot);if(a===null)return;let o=n.width/2,s=n.height/2,c=r.anchorImgX-o,l=r.anchorImgY-s,u=r.startScaleX,d=r.startScaleY;if(r.axis!==`y`){let e=r.grabLocalX-c;Math.abs(e)>1e-9&&(u=r.startScaleX*(a.x-o-c)/e)}if(r.axis!==`x`){let e=r.grabLocalY-l;Math.abs(e)>1e-9&&(d=r.startScaleY*(a.y-s-l)/e)}u=Math.min(1024/n.width,Math.max(1/n.width,u)),d=Math.min(1024/n.height,Math.max(1/n.height,d));let f=Su({...r.snapshot,scaleX:u,scaleY:d});this.setLayerTransform(n.id,{scaleX:u,scaleY:d,x:r.anchorProjectX-(f.a*c+f.b*l),y:r.anchorProjectY-(f.c*c+f.d*l)}),this.lastMouseClient={x:e,y:t}}}rot3DFrameFor(e){let t=this.activeLayer();if(t===null||t.width<1||t.height<1)return null;let n=this.renderer.domElement.getBoundingClientRect();if(n.width<=0||n.height<=0)return null;let r,i,a,o,s;if(e===`floating`){let e=this.floating;if(e===null||!e.active||!this.floatingHomeVisible())return null;r=Fu(this.floatingPlacement(e)),i=e.cx,a=e.cy,o=Math.max(e.width,e.height)/2,s=e.layerId}else r=bu(t.transform),i=t.width/2,a=t.height/2,o=Math.max(t.width,t.height)/2,s=t.id;if(!(o>0))return null;let c={left:0,top:0,width:n.width,height:n.height},l=this.viewTransform(),u=(n,o,s)=>{let u=r[0][0]*n+r[0][1]*o+r[0][2]*s,d=r[1][0]*n+r[1][1]*o+r[1][2]*s,f=r[2][0]*n+r[2][1]*o+r[2][2]*s,p,m;if(e===`floating`){let e=Cu(i+u,a+d,t.width,t.height,t.transform);p=e.x,m=e.y}else p=t.transform.x+u,m=t.transform.y+d;let h=Ou(p,m,c,l);return{x:h.x,y:h.y,front:f>=0}},d=u(0,0,0),f=Math.max(24,o*this.zoom),p={x:[],y:[],z:[]};for(let e of[`x`,`y`,`z`])for(let t=0;t<120;t+=1){let[n,r,i]=Hf(e,t/120*Math.PI*2,o);p[e].push(u(n,r,i))}return{target:e,layerId:s,center:{x:d.x,y:d.y},radiusPx:f,sphereR:o,toScreen:u,rings:p}}rot3DHandlePositions(e){let t=[];for(let n of[{id:`rot3d-x`,axis:`x`},{id:`rot3d-y`,axis:`y`},{id:`rot3d-z`,axis:`z`}]){let[r,i,a]=Hf(n.axis,Math.PI/4,e.sphereR),o=e.toScreen(r,i,a);t.push({id:n.id,x:o.x,y:o.y})}return t}rot3DHitTest(e,t){let n=this.tool===`transform3d`?`layer`:this.tool===`destransform3d`?`floating`:null;if(n===null)return null;let r=this.rot3DFrameFor(n);if(r===null)return null;let i=this.renderer.domElement.getBoundingClientRect(),a=e-i.left,o=t-i.top;for(let e of this.rot3DHandlePositions(r)){let t=e.x-a,n=e.y-o;if(t*t+n*n<=144){let t=e.id.slice(-1);return{kind:`axis`,id:e.id,axis:t,phi:Math.PI/4}}}let s=r.center.x-a,c=r.center.y-o;if(s*s+c*c<=144)return{kind:`center`,id:`center`,axis:`z`,phi:0};for(let e of[`x`,`y`,`z`]){let t=r.rings[e],n=1/0,i=0;for(let e=0;e<t.length;e+=1){let r=t[e];if(r===void 0)continue;let s=r.x-a,c=r.y-o,l=s*s+c*c;l<n&&(n=l,i=e/t.length*Math.PI*2)}if(n<=100)return{kind:`axis`,id:`rot3d-${e}`,axis:e,phi:i}}let l=r.center.x-a,u=r.center.y-o;return l*l+u*u<=r.radiusPx*r.radiusPx?{kind:`body`,id:`center`,axis:`z`,phi:0}:null}rot3DStartAngle(e,t,n){if(e===`layer`){let e=this.activeLayer();return e===null||e.id!==t?null:n===`x`?e.transform.rotationX:n===`y`?e.transform.rotationY:e.transform.rotation}let r=this.floating;return r===null||!r.active||r.layerId!==t?null:n===`x`?r.rotationX:n===`y`?r.rotationY:r.rotation}applyRot3DAngle(e,t,n,r){if(e===`layer`){let e=this.activeLayer();return e===null||e.id!==t?!1:(n===`x`?this.setLayerTransform(t,{rotationX:r}):n===`y`?this.setLayerTransform(t,{rotationY:r}):this.setLayerTransform(t,{rotation:r}),!0)}let i=this.floating;return i===null||!i.active||i.layerId!==t||!this.floatingHomeVisible()?!1:(n===`x`?i.rotationX=ju(r):n===`y`?i.rotationY=ju(r):i.rotation=ju(r),this.afterFloatingChange(),!0)}beginRot3DGesture(e,t){let n=this.tool===`transform3d`?`layer`:this.tool===`destransform3d`?`floating`:null;if(n===null)return!1;let r=this.rot3DFrameFor(n);if(r===null)return!1;if(e.kind===`center`)return this.rot3dCenterTap={target:n,layerId:r.layerId,startClientX:t.clientX,startClientY:t.clientY,radiusPx:r.radiusPx},!0;if(e.kind===`axis`){let i=this.rot3DStartAngle(n,r.layerId,e.axis);return i!==null&&(this.axisDrag={target:n,layerId:r.layerId,axis:e.axis,startAngle:i,startPhi:e.phi,phi:e.phi,lastClientX:t.clientX,lastClientY:t.clientY,sphereR:r.sphereR,project:r.toScreen},!0)}let i=this.rot3DStartAngle(n,r.layerId,`x`),a=this.rot3DStartAngle(n,r.layerId,`y`);return i===null||a===null?!1:(this.trackballDrag={target:n,layerId:r.layerId,startRotationX:i,startRotationY:a,grabClientX:t.clientX,grabClientY:t.clientY,radiusPx:r.radiusPx},!0)}updateRot3DGesture(e,t){if(this.trackballDrag!==null){let n=this.trackballDrag,r=this.applyRot3DAngle(n.target,n.layerId,`x`,n.startRotationX+(t-n.grabClientY)/n.radiusPx),i=this.applyRot3DAngle(n.target,n.layerId,`y`,n.startRotationY-(e-n.grabClientX)/n.radiusPx);if(!r||!i){this.trackballDrag=null;return}this.lastMouseClient={x:e,y:t}}else if(this.axisDrag!==null){let n=this.axisDrag,r=.01,i=n.project(...Hf(n.axis,n.phi+r,n.sphereR)),a=n.project(...Hf(n.axis,n.phi-r,n.sphereR)),o=(i.x-a.x)/(2*r),s=(i.y-a.y)/(2*r),c=o*o+s*s;if(!(c>1e-9))return;let l=e-n.lastClientX,u=t-n.lastClientY;n.phi+=(l*o+u*s)/c,n.lastClientX=e,n.lastClientY=t,this.applyRot3DAngle(n.target,n.layerId,n.axis,n.startAngle+(n.phi-n.startPhi))?this.lastMouseClient={x:e,y:t}:this.axisDrag=null}}resetRot3DAngles(e,t){if(e===`layer`){let e=this.activeLayer();return e===null||e.id!==t?!1:(this.setLayerTransform(t,{rotation:0,rotationX:0,rotationY:0}),!0)}return this.resetFloatingRotations()}floatingHomeVisible(){let e=this.floating;if(e===null||!e.active||e.frame!==this.currentFrame)return!1;let t=this.activeLayer();return t!==null&&t.id===e.layerId&&t.renderTextureId===e.textureId}commitFloatingIfHomeTexture(e){this.floating!==null&&this.floating.active&&this.floating.textureId===e&&this.commitFloating()}dropFloating(){(this.floating!==null||this.floatingPlane!==null)&&(this.floating=null,this.clearTransformGestures(),this.disposeFloatingPlane(),this.updatePreviews())}commitFloating(){let e=this.floating;if(e===null||!e.active)return!1;let t=this.textures.get(e.textureId);if(t===void 0)return this.floating=null,this.clearTransformGestures(),this.disposeFloatingPlane(),this.updatePreviews(),!1;let n=this.floatingPlacement(e);if(Lu(n))return!1;let r=Bu(n),i=Math.max(0,Math.floor(r.minX)),a=Math.max(0,Math.floor(r.minY)),o=Math.min(t.width,Math.ceil(r.maxX)),s=Math.min(t.height,Math.ceil(r.maxY));if(i>=o||a>=s)return!1;let c=t.buffer.slice(),l=1e-6;for(let r=a;r<s;r+=1)for(let a=i;a<o;a+=1){let i=zu(n,a+.5,r+.5);if(i===null)continue;let o=Math.floor(i.x+l),s=Math.floor(i.y+l);if(o<0||s<0||o>=e.width||s>=e.height)continue;let c=(s*e.width+o)*4,u=(r*t.width+a)*4;t.buffer[u]=e.buffer[c],t.buffer[u+1]=e.buffer[c+1],t.buffer[u+2]=e.buffer[c+2],t.buffer[u+3]=e.buffer[c+3]}this.floating=null,this.clearTransformGestures(),this.disposeFloatingPlane();let u=zf(c,t.buffer,t.width,t.height);return u===null?(this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.emitStats(),this.updatePreviews(),!1):(this.pushHistory({type:`stroke`,layerId:t.id,diff:u}),this.markTextureViewsDirty(t.id),this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),this.updatePreviews(),!0)}cutRectToFloating(e,t,n,r){let i=this.activeLayer();if(i===null)return!1;let a=this.ensureCellContent(i.id,this.currentFrame);if(a===null)return!1;this.syncLayerRender(i),this.refreshLayerStacking();let o=a.texture,s=Math.max(0,Math.min(e,n)),c=Math.max(0,Math.min(t,r)),l=Math.min(o.width,Math.max(e,n)+1),u=Math.min(o.height,Math.max(t,r)+1);if(s>=l||c>=u)return!1;this.commitFloating();let d=o.buffer.slice(),f=l-s,p=u-c,m=new Uint8ClampedArray(f*p*4);for(let e=0;e<p;e+=1){let t=((c+e)*o.width+s)*4;m.set(o.buffer.subarray(t,t+f*4),e*f*4),o.buffer.fill(0,t,t+f*4)}let h=zf(d,o.buffer,o.width,o.height);return h!==null&&this.pushHistory({type:`stroke`,layerId:o.id,diff:h}),this.floating={buffer:m,width:f,height:p,cx:s+f/2,cy:c+p/2,rotation:0,scaleX:1,scaleY:1,skewX:0,skewY:0,rotationX:0,rotationY:0,flipX:!1,flipY:!1,initial:{cx:s+f/2,cy:c+p/2,rotation:0,scaleX:1,scaleY:1,skewX:0,skewY:0,rotationX:0,rotationY:0,flipX:!1,flipY:!1},layerId:i.id,frame:this.currentFrame,textureId:o.id,cutDepth:this.history.undoDepth(),active:!0},this.markTextureViewsDirty(o.id),this.syncAllLayerRenders(),this.syncFloatingPlane(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),this.updatePreviews(),!0}cutAllToFloating(){let e=this.activeLayer();return e===null||e.width<1||e.height<1?!1:this.cutRectToFloating(0,0,e.width-1,e.height-1)}syncFloatingWithHistory(){let e=this.floating;if(e===null)return;let t=this.history.undoDepth();e.active&&t<e.cutDepth?e.active=!1:!e.active&&t>=e.cutDepth&&(e.active=!0),this.syncFloatingPlane(),this.updatePreviews()}disposeFloatingPlane(){this.floatingPlane!==null&&(this.scene.remove(this.floatingPlane),this.floatingPlane=null),this.floatingMaterial!==null&&(this.floatingMaterial.dispose(),this.floatingMaterial=null),this.floatingTexture!==null&&(this.floatingTexture.dispose(),this.floatingTexture=null),this.floatingPlaneFor=null}clearTransformGestures(){this.moveDrag=null,this.resizeDrag=null,this.rotateDrag=null,this.skewDrag=null,this.centerTap=null,this.flipTap=null,this.layerResizeDrag=null,this.layerRotateDrag=null,this.layerSkewDrag=null,this.layerCenterTap=null,this.layerFlipTap=null,this.trackballDrag=null,this.rot3dCenterTap=null,this.axisDrag=null}clearTransformDrags(){this.moveDrag=null,this.resizeDrag=null,this.rotateDrag=null,this.skewDrag=null,this.layerResizeDrag=null,this.layerRotateDrag=null,this.layerSkewDrag=null,this.trackballDrag=null,this.axisDrag=null}syncFloatingPlane(){let e=this.floating;if(e===null||!e.active||!this.floatingHomeVisible()){this.floatingPlane!==null&&(this.floatingPlane.visible=!1);return}if(this.floatingPlane===null||this.floatingPlaneFor!==e){this.disposeFloatingPlane();let t=new Ki(e.buffer,e.width,e.height);t.magFilter=Ee,t.minFilter=Ee,t.generateMipmaps=!1,t.flipY=!0,t.needsUpdate=!0;let n=new Ea({uniforms:{uMap:{value:t},uOpacity:{value:1}},vertexShader:Gf,fragmentShader:qf,side:2,transparent:!0,depthWrite:!1}),r=new Ui(this.sharedGeometry,n);r.matrixAutoUpdate=!1,this.scene.add(r),this.floatingPlane=r,this.floatingMaterial=n,this.floatingTexture=t,this.floatingPlaneFor=e}let t=this.activeLayer();if(t===null){this.floatingPlane.visible=!1;return}let n=this.floatingPlacement(e),r=this.container.getBoundingClientRect(),i=Math.max(1,r.width),a=Math.max(1,r.height),o={left:0,top:0,width:i,height:a},s=this.viewTransform(),c=(r,i)=>{let a=Ru(n,(r+.5)*e.width,(.5-i)*e.height),c=Cu(a.x,a.y,t.width,t.height,t.transform);return Ou(c.x,c.y,o,s)},l=c(0,0),u=c(1,0),d=c(0,1),f=this.floatingPlane.matrix.elements;f[0]=u.x-l.x,f[1]=-(u.y-l.y),f[2]=0,f[3]=0,f[4]=d.x-l.x,f[5]=-(d.y-l.y),f[6]=0,f[7]=0,f[8]=0,f[9]=0,f[10]=1,f[11]=0,f[12]=l.x-i/2,f[13]=a/2-l.y,f[14]=this.layers.length*.01+.01,f[15]=1,this.floatingPlane.matrixWorldNeedsUpdate=!0,this.floatingPlane.visible=!0}paintStabilizedSegment(e,t,n,r){let i=this.pencilAntialias?n.x:Math.floor(n.x),a=this.pencilAntialias?n.y:Math.floor(n.y),o=this.pencilAntialias?r.x:Math.floor(r.x),s=this.pencilAntialias?r.y:Math.floor(r.y);this.pencilPixelPerfectActive()?this.paintPencilLine(e,t,i,a,o,s):!this.accumulate&&this.strokeBase!==null&&this.strokeMask!==null?(lu(this.strokeMask,e.width,e.height,i,a,o,s,this.brushSize,this.brushShape,this.pencilAntialias),this.repaintFromMask(e,this.strokeBase,this.strokeMask,t)):iu(e.buffer,e.width,e.height,i,a,o,s,this.brushSize,this.brushShape,this.pencilAntialias,this.color,t,this.blendMode)}stopFollowLoop(){this.followLoopId!==null&&(cancelAnimationFrame(this.followLoopId),this.followLoopId=null)}ensureFollowLoop(){this.stabilizerMode!==`follow`||this.followLoopId!==null||this.disposed||this.stabilizerPos!==null&&this.stabilizerTarget!==null&&(Gu(this.stabilizerPos,this.stabilizerTarget)<.001||(this.followLoopId=requestAnimationFrame(()=>{this.followLoopId=null,this.followTick()})))}followTick(){if(this.disposed||this.stabilizerMode!==`follow`)return;let e=this.stabilizerPos,t=this.stabilizerTarget;if(e===null||t===null)return;if(Gu(e,t)<.001){this.updatePreviews();return}let n=qu(e,t,this.followStrength);if(this.stabilizerPos=n,this.drawing&&this.strokeLayerId!==null){let t=this.activeLayer(),r=this.textures.get(this.strokeLayerId);t!==null&&r!==void 0&&(this.paintStabilizedSegment(r,t.lockedChannels,e,n),this.markTextureViewsDirty(r.id),this.render(),this.onPixelsChanged())}this.updatePreviews(),this.ensureFollowLoop()}stabilizerPosToClient(e){let t=this.activeLayer();if(t===null||t.width<1||t.height<1)return null;let n=this.renderer.domElement.getBoundingClientRect();if(n.width<=0||n.height<=0)return null;let r=Cu(e.x,e.y,t.width,t.height,t.transform);return Ou(r.x,r.y,{left:n.left,top:n.top,width:n.width,height:n.height},this.viewTransform())}commitLineTo(e,t){let n=this.activeLayer();if(n===null)return!1;let r=this.ensureCellContent(n.id,this.currentFrame);if(r===null||!Number.isInteger(e)||!Number.isInteger(t)||e<0||t<0||e>=r.texture.width||t>=r.texture.height||this.lineAnchor===null)return!1;let i=r.texture,a=i.buffer.slice();if(this.accumulate)iu(i.buffer,i.width,i.height,this.lineAnchor.x,this.lineAnchor.y,e,t,this.lineWidth,this.lineShape,this.lineAntialias,this.color,n.lockedChannels,this.blendMode);else{let r=new Uint8Array(i.width*i.height);lu(r,i.width,i.height,this.lineAnchor.x,this.lineAnchor.y,e,t,this.lineWidth,this.lineShape,this.lineAntialias),this.repaintFromMask(i,a,r,n.lockedChannels)}this.lineAnchor=null;let o=zf(a,i.buffer,i.width,i.height);return o===null?(this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.updatePreviews(),this.emitStats(),!1):(this.pushHistory({type:`stroke`,layerId:i.id,diff:o}),this.syncAllLayerRenders(),this.markTextureViewsDirty(i.id),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),this.updatePreviews(),!0)}commitCurveTo(e,t){if(this.curvePhase!==`awaitC2`)return!1;let n=this.curveP0,r=this.curveP3,i=this.curveC1;if(n===null||r===null||i===null||!Number.isFinite(e)||!Number.isFinite(t))return!1;let a=this.activeLayer();if(a===null)return!1;let o=this.ensureCellContent(a.id,this.currentFrame);if(o===null)return!1;let s=o.texture,c=s.buffer.slice();if(this.curvePixelPerfectActive())this.paintPixelPerfectCurve(s,a.lockedChannels,c,{x:n.x,y:n.y},{x:i.x,y:i.y},{x:e,y:t},{x:r.x,y:r.y});else if(this.accumulate)au(s.buffer,s.width,s.height,{x:n.x,y:n.y},{x:i.x,y:i.y},{x:e,y:t},{x:r.x,y:r.y},this.curveWidth,this.curveShape,this.curveAntialias,this.color,a.lockedChannels,this.blendMode);else{let o=new Uint8Array(s.width*s.height);uu(o,s.width,s.height,{x:n.x,y:n.y},{x:i.x,y:i.y},{x:e,y:t},{x:r.x,y:r.y},this.curveWidth,this.curveShape,this.curveAntialias),this.repaintFromMask(s,c,o,a.lockedChannels)}this.resetCurveState();let l=zf(c,s.buffer,s.width,s.height);return l===null?(this.syncAllLayerRenders(),this.refreshLayerStacking(),this.render(),this.updatePreviews(),this.emitStats(),!1):(this.pushHistory({type:`stroke`,layerId:s.id,diff:l}),this.syncAllLayerRenders(),this.markTextureViewsDirty(s.id),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),this.updatePreviews(),!0)}colorCss(){let e=Math.round(this.color.a/255*100)/100;return`rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${e})`}updateStabilizerOverlay(){let e=this.lastMouseClient;if(!this.isStabilizing()||e===null||this.stabilizerPos===null){this.previewStabilizer.style.display=`none`,this.previewStabilizerLine.style.display=`none`;return}let t=this.stabilizerPosToClient(this.stabilizerPos);if(t===null){this.previewStabilizer.style.display=`none`,this.previewStabilizerLine.style.display=`none`;return}let n=this.renderer.domElement.getBoundingClientRect();this.previewStabilizer.style.display=`block`,this.previewStabilizer.style.left=`${t.x-n.left-5}px`,this.previewStabilizer.style.top=`${t.y-n.top-5}px`,this.previewSvg.style.display=`block`,this.previewStabilizerLine.style.display=`block`,this.previewStabilizerLine.setAttribute(`x1`,String(e.x-n.left)),this.previewStabilizerLine.setAttribute(`y1`,String(e.y-n.top)),this.previewStabilizerLine.setAttribute(`x2`,String(t.x-n.left)),this.previewStabilizerLine.setAttribute(`y2`,String(t.y-n.top))}selectionOverlayQuad(){if(this.rectDrag!==null){let e=this.rectDrag,t=Math.min(e.x0,e.x1),n=Math.min(e.y0,e.y1),r=Math.max(e.x0,e.x1)+1,i=Math.max(e.y0,e.y1)+1;return[{x:t,y:n},{x:r,y:n},{x:r,y:i},{x:t,y:i}]}let e=this.floating;if(e!==null&&e.active&&this.floatingHomeVisible()){let t=this.floatingPlacement(e);return[[0,0],[e.width,0],[e.width,e.height],[0,e.height]].map(([e,n])=>Ru(t,e,n))}if(this.tool===`transform`||this.tool===`transform3d`){let e=this.activeLayer();return e===null||e.width<1||e.height<1?null:[{x:0,y:0},{x:e.width,y:0},{x:e.width,y:e.height},{x:0,y:e.height}]}return null}hideSelectionHandles(){for(let e of this.selectionHandles)e.group.style.display=`none`}hideRot3dGizmo(){for(let e of[`x`,`y`,`z`])this.rot3dRings[e].front.style.display=`none`,this.rot3dRings[e].back.style.display=`none`,this.rot3dAxes[e].style.display=`none`}rot3DRingPath(e,t){let n=``,r=!1;for(let i of e)i.front===t?(n+=`${r?`L`:`M`}${i.x.toFixed(1)},${i.y.toFixed(1)}`,r=!0):r=!1;return n}updateSelectionOverlay(){let e=this.selectionOverlayQuad(),t=this.activeLayer();if(e===null||t===null||t.width<1||t.height<1){this.previewSelectWhite.style.display=`none`,this.previewSelectBlack.style.display=`none`,this.hideSelectionHandles();return}let n=this.renderer.domElement.getBoundingClientRect();if(n.width<=0||n.height<=0){this.previewSelectWhite.style.display=`none`,this.previewSelectBlack.style.display=`none`,this.hideSelectionHandles();return}let r=(e,r)=>{let i=Cu(e,r,t.width,t.height,t.transform),a=Ou(i.x,i.y,{left:n.left,top:n.top,width:n.width,height:n.height},this.viewTransform());return`${a.x-n.left},${a.y-n.top}`},i=e.map(e=>r(e.x,e.y)).join(` `);if(this.previewSvg.style.display=`block`,this.previewSelectWhite.setAttribute(`points`,i),this.previewSelectWhite.style.display=`block`,this.previewSelectBlack.setAttribute(`points`,i),this.previewSelectBlack.style.display=`block`,this.tool===`destransform`||this.tool===`transform`){let e=this.tool===`destransform`?this.selectionHandleLayout():this.layerHandleLayout(),t=new Set;if(e!==null)for(let n of e){let e=this.selectionHandles.find(e=>e.id===n.id)?.group;e!==void 0&&(e.setAttribute(`transform`,`translate(${n.x} ${n.y}) rotate(${n.angle})`),e.style.display=`block`,t.add(n.id))}for(let e of this.selectionHandles)t.has(e.id)||(e.group.style.display=`none`);this.hideRot3dGizmo()}else if(this.tool===`transform3d`||this.tool===`destransform3d`){let e=this.rot3DFrameFor(this.tool===`transform3d`?`layer`:`floating`),t=new Set;if(e!==null){this.previewSvg.style.display=`block`;for(let t of[`x`,`y`,`z`]){let n=this.rot3dRings[t];n.front.setAttribute(`d`,this.rot3DRingPath(e.rings[t],!0)),n.front.style.display=`block`,n.back.setAttribute(`d`,this.rot3DRingPath(e.rings[t],!1)),n.back.style.display=`block`;let r=this.rot3dAxes[t],[i,a]=Uf(t,e.sphereR),o=e.toScreen(...i),s=e.toScreen(...a);r.setAttribute(`x1`,String(o.x)),r.setAttribute(`y1`,String(o.y)),r.setAttribute(`x2`,String(s.x)),r.setAttribute(`y2`,String(s.y)),r.style.display=`block`}let n=[...this.rot3DHandlePositions(e),{id:`center`,x:e.center.x,y:e.center.y}];for(let e of n){let n=this.selectionHandles.find(t=>t.id===e.id)?.group;n!==void 0&&(n.setAttribute(`transform`,`translate(${e.x} ${e.y})`),n.style.display=`block`,t.add(e.id))}}else this.hideRot3dGizmo();for(let e of this.selectionHandles)t.has(e.id)||(e.group.style.display=`none`)}else this.hideSelectionHandles(),this.hideRot3dGizmo()}hidePreviewSvgIfIdle(){this.previewStabilizerLine.style.display!==`block`&&this.previewSelectWhite.style.display!==`block`&&(this.previewSvg.style.display=`none`)}updatePreviews(){if(this.disposed)return;let e=this.lastMouseClient;if(this.tool!==`pencil`&&this.tool!==`line`&&this.tool!==`curve`||e===null||e===null)this.previewTip.style.display=`none`;else{let t=this.renderer.domElement.getBoundingClientRect(),n=(this.tool===`pencil`?this.brushSize:this.tool===`line`?this.lineWidth:this.curveWidth)*this.zoom,r=this.tool===`pencil`?this.brushShape:this.tool===`line`?this.lineShape:this.curveShape,i=Math.max(2,n);this.previewTip.style.display=`block`,this.previewTip.style.width=`${i}px`,this.previewTip.style.height=`${i}px`,this.previewTip.style.left=`${e.x-t.left-i/2}px`,this.previewTip.style.top=`${e.y-t.top-i/2}px`,this.previewTip.style.borderRadius=r===`circle`?`50%`:`0`}this.previewLine.removeAttribute(`display`),this.previewLine.style.display=`none`,this.previewCurve.style.display=`none`,this.previewHandleA.style.display=`none`,this.previewHandleB.style.display=`none`,this.previewStabilizerLine.style.display=`none`,this.previewSelectWhite.style.display=`none`,this.previewSelectBlack.style.display=`none`,this.hideSelectionHandles(),this.hideRot3dGizmo();for(let e of this.previewMarkers)e.style.display=`none`;if(this.updateStabilizerOverlay(),this.updateSelectionOverlay(),e===null){this.hidePreviewSvgIfIdle();return}let t=this.renderer.domElement.getBoundingClientRect(),n=(e,n)=>({x:e-t.left,y:n-t.top}),r=(e,t,r)=>{let i=this.previewMarkers[e];if(i===void 0)return;let a=n(t,r);i.setAttribute(`cx`,String(a.x)),i.setAttribute(`cy`,String(a.y)),i.style.display=`block`};if(this.tool===`line`&&this.lineAnchor!==null)this.previewSvg.style.display=`block`,this.previewLine.style.display=`block`,this.previewLine.setAttribute(`x1`,String(this.lineAnchor.clientX-t.left)),this.previewLine.setAttribute(`y1`,String(this.lineAnchor.clientY-t.top)),this.previewLine.setAttribute(`x2`,String(e.x-t.left)),this.previewLine.setAttribute(`y2`,String(e.y-t.top)),this.previewLine.setAttribute(`stroke`,this.colorCss()),this.previewLine.setAttribute(`stroke-width`,String(Math.max(1,this.lineWidth*this.zoom))),this.previewLine.setAttribute(`stroke-linecap`,this.lineShape===`circle`?`round`:`butt`);else if(this.tool!==`curve`)this.hidePreviewSvgIfIdle();else if(this.curvePhase===`dragging`&&this.curveP0!==null){let n=this.curveDragCurrent,i=n===null?e.x:n.clientX,a=n===null?e.y:n.clientY;this.previewSvg.style.display=`block`,this.previewLine.style.display=`block`,this.previewLine.setAttribute(`x1`,String(this.curveP0.clientX-t.left)),this.previewLine.setAttribute(`y1`,String(this.curveP0.clientY-t.top)),this.previewLine.setAttribute(`x2`,String(i-t.left)),this.previewLine.setAttribute(`y2`,String(a-t.top)),this.previewLine.setAttribute(`stroke`,this.colorCss()),this.previewLine.setAttribute(`stroke-width`,String(Math.max(1,this.curveWidth*this.zoom))),this.previewLine.setAttribute(`stroke-linecap`,this.curveShape===`circle`?`round`:`butt`),r(0,this.curveP0.clientX,this.curveP0.clientY),r(3,i,a)}else if(this.curvePhase===`awaitC1`&&this.curveP0!==null&&this.curveP3!==null){this.previewSvg.style.display=`block`;let t=n(this.curveP0.clientX,this.curveP0.clientY),i=n(this.curveP3.clientX,this.curveP3.clientY),a=n(e.x,e.y);this.previewCurve.style.display=`block`,this.previewCurve.setAttribute(`d`,`M ${t.x} ${t.y} C ${a.x} ${a.y} ${i.x} ${i.y} ${i.x} ${i.y}`),this.previewCurve.setAttribute(`stroke`,this.colorCss()),this.previewCurve.setAttribute(`stroke-width`,String(Math.max(1,this.curveWidth*this.zoom))),this.previewCurve.setAttribute(`stroke-linecap`,this.curveShape===`circle`?`round`:`butt`),this.previewHandleA.style.display=`block`,this.previewHandleA.setAttribute(`x1`,String(t.x)),this.previewHandleA.setAttribute(`y1`,String(t.y)),this.previewHandleA.setAttribute(`x2`,String(a.x)),this.previewHandleA.setAttribute(`y2`,String(a.y)),r(0,this.curveP0.clientX,this.curveP0.clientY),r(1,e.x,e.y),r(3,this.curveP3.clientX,this.curveP3.clientY)}else if(this.curvePhase===`awaitC2`&&this.curveP0!==null&&this.curveP3!==null&&this.curveC1!==null){this.previewSvg.style.display=`block`;let t=n(this.curveP0.clientX,this.curveP0.clientY),i=n(this.curveP3.clientX,this.curveP3.clientY),a=n(this.curveC1.clientX,this.curveC1.clientY),o=n(e.x,e.y);this.previewCurve.style.display=`block`,this.previewCurve.setAttribute(`d`,`M ${t.x} ${t.y} C ${a.x} ${a.y} ${o.x} ${o.y} ${i.x} ${i.y}`),this.previewCurve.setAttribute(`stroke`,this.colorCss()),this.previewCurve.setAttribute(`stroke-width`,String(Math.max(1,this.curveWidth*this.zoom))),this.previewCurve.setAttribute(`stroke-linecap`,this.curveShape===`circle`?`round`:`butt`),this.previewHandleA.style.display=`block`,this.previewHandleA.setAttribute(`x1`,String(t.x)),this.previewHandleA.setAttribute(`y1`,String(t.y)),this.previewHandleA.setAttribute(`x2`,String(a.x)),this.previewHandleA.setAttribute(`y2`,String(a.y)),this.previewHandleB.style.display=`block`,this.previewHandleB.setAttribute(`x1`,String(i.x)),this.previewHandleB.setAttribute(`y1`,String(i.y)),this.previewHandleB.setAttribute(`x2`,String(o.x)),this.previewHandleB.setAttribute(`y2`,String(o.y)),r(0,this.curveP0.clientX,this.curveP0.clientY),r(1,this.curveC1.clientX,this.curveC1.clientY),r(2,e.x,e.y),r(3,this.curveP3.clientX,this.curveP3.clientY)}else this.hidePreviewSvgIfIdle()}hidePreviews(){this.previewTip.style.display=`none`,this.previewStabilizer.style.display=`none`,this.previewSvg.style.display=`none`,this.previewLine.style.display=`none`,this.previewCurve.style.display=`none`,this.previewHandleA.style.display=`none`,this.previewHandleB.style.display=`none`,this.previewStabilizerLine.style.display=`none`,this.previewSelectWhite.style.display=`none`,this.previewSelectBlack.style.display=`none`,this.hideSelectionHandles(),this.hideRot3dGizmo();for(let e of this.previewMarkers)e.style.display=`none`}clear(){let e=this.activeLayer();if(e===null)return;let t=this.ensureCellContent(e.id,this.currentFrame);if(t===null)return;let n=t.texture,r=n.buffer.slice();Gl(n.buffer,e.lockedChannels);let i=zf(r,n.buffer,n.width,n.height);i!==null&&this.pushHistory({type:`stroke`,layerId:n.id,diff:i}),this.syncAllLayerRenders(),this.markTextureViewsDirty(n.id),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats()}clearCurrentCellTexture(){let e=this.activeLayer();if(e===null)return!1;let t=this.getCellContentId(e.id,this.currentFrame);if(t===null)return!1;let n=this.contents.get(t);if(n===void 0||n.textureId===null)return!1;let r=this.textures.get(n.textureId);if(r===void 0)return!1;let i=r.buffer.slice();r.buffer.fill(0);let a=zf(i,r.buffer,r.width,r.height);return a!==null&&(this.pushHistory({type:`stroke`,layerId:r.id,diff:a}),this.syncAllLayerRenders(),this.markTextureViewsDirty(r.id),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0)}bucketFillAt(e,t){let n=this.activeLayer();if(n===null)return 0;let r=this.ensureCellContent(n.id,this.currentFrame);if(r===null)return 0;let i=r.texture;if(!Number.isInteger(e)||!Number.isInteger(t)||e<0||t<0||e>=i.width||t>=i.height)return 0;let a=i.buffer.slice(),o=Yl(i.buffer,i.width,i.height,e,t,this.color,n.lockedChannels,this.blendMode);if(o===0)return 0;let s=zf(a,i.buffer,i.width,i.height);return s===null?0:(this.pushHistory({type:`stroke`,layerId:i.id,diff:s}),this.syncAllLayerRenders(),this.markTextureViewsDirty(i.id),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),o)}bucketFillAtClient(e,t){let n=this.toImagePixel(e,t);return n===null?0:this.bucketFillAt(n.x,n.y)}setZoom(e){this.zoom=Au(e),this.layoutScene(),this.render(),this.updatePreviews(),this.emitStats()}zoomBy(e){this.setZoom(this.zoom*e)}zoomAtPoint(e,t,n){let r=this.renderer.domElement.getBoundingClientRect(),i=r.left+r.width/2,a=r.top+r.height/2,o=Math.cos(this.rotation),s=Math.sin(this.rotation),c=e-i-this.panX,l=t-a-this.panY,u=(o*c+s*l)/this.zoom,d=(-s*c+o*l)/this.zoom,f=Au(this.zoom*n);this.zoom=f,this.panX=e-i-(o*u-s*d)*f,this.panY=t-a-(s*u+o*d)*f,this.layoutScene(),this.render(),this.updatePreviews(),this.emitStats()}setRotation(e){this.rotation=ju(e),this.layoutScene(),this.render(),this.updatePreviews(),this.emitStats()}getRotationStepDeg(){return this.rotationStepDeg}setRotationStepDeg(e){let t=md(e);return t!==this.rotationStepDeg&&(this.rotationStepDeg=t,!0)}rotateByDegrees(e){Number.isFinite(e)&&e!==0&&this.setRotation(this.rotation+e*Math.PI/180)}resetRotation(){this.setRotation(0)}zoomToFit(){let e=this.container.getBoundingClientRect(),t=Nu(this.imageWidth,this.imageHeight,this.rotation);if(e.width>0&&e.height>0&&t.width>0&&t.height>0){let n=Math.min(e.width/t.width,e.height/t.height);this.zoom=Au(Math.max(1,Math.floor(n)))}else this.zoom=8;this.panX=0,this.panY=0,this.layoutScene(),this.render(),this.updatePreviews(),this.emitStats()}setFlip(e,t){this.flipX=e,this.flipY=t,this.layoutScene(),this.render(),this.updatePreviews(),this.emitStats()}setTool(e){this.tempEyedropper&&e!==`eyedropper`&&(this.tempEyedropper=!1,this.toolBeforeEyedropper=null),this.tool=e,e!==`line`&&(this.lineAnchor=null),e!==`curve`&&this.resetCurveState(),e!==`pencil`&&(this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop()),this.sizeDrag=null,this.rectDrag=null,this.clearTransformGestures(),this.resetPencilPixelPerfect(),this.updatePreviews(),this.onToolChanged?.(e)}getViewState(){return{zoom:this.zoom,rotation:this.rotation,flipX:this.flipX,flipY:this.flipY}}beginTempEyedropper(){this.tempEyedropper||this.tool===`eyedropper`||(this.toolBeforeEyedropper=this.tool,this.tempEyedropper=!0,this.setTool(`eyedropper`))}endTempEyedropper(){if(!this.tempEyedropper)return;let e=this.toolBeforeEyedropper;this.tempEyedropper=!1,this.toolBeforeEyedropper=null,e!==null&&this.setTool(e)}pickColorAt(e,t){let n=this.toImagePixel(e,t);if(n===null)return!1;let r=this.activeLayer();if(r===null)return!1;let i=ql(r.buffer,r.width,r.height,n.x,n.y);return i!==null&&(this.onEyedropperPick?.(Xd({r:i.r,g:i.g,b:i.b,a:i.a})),!0)}undo(){return this.history.undo(e=>this.historyLayerFor(e),e=>this.insertLayerSnapshot(e),(e,t,n,r)=>this.applyLayerResize(e,t,n,r),(e,t,n,r,i)=>this.applyFitToSize(e,t,n,r,i),(e,t,n)=>this.associateCellForHistory(e,t,n),(e,t)=>this.dissociateCellForHistory(e,t),(e,t)=>this.setContentTextureForHistory(e,t))?(this.syncFloatingWithHistory(),this.markLayersDirty(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0):!1}redo(){return this.history.redo(e=>this.historyLayerFor(e),e=>{this.removeLayerFull(e)},(e,t,n,r)=>this.applyLayerResize(e,t,n,r),(e,t,n,r,i)=>this.applyFitToSize(e,t,n,r,i),(e,t)=>this.dissociateCellForHistory(e,t),(e,t,n)=>this.associateCellForHistory(e,t,n),(e,t)=>this.setContentTextureForHistory(e,t))?(this.syncFloatingWithHistory(),this.markLayersDirty(),this.refreshLayerStacking(),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),!0):!1}historyLayerFor(e){return this.historyTextureFor(e)}markLayersDirty(){for(let e of this.layers)e.texture.needsUpdate=!0}applyCheckerSettings(e){this.checkerMode=e.mode,this.checkerSizeX=$u(e.sizeX),this.checkerSizeY=$u(e.sizeY);let t=pu(e.colorA),n=pu(e.colorB);t!==null&&(this.checkerColorA=e.colorA,this.checkerColorAVec.set(t.r/255,t.g/255,t.b/255)),n!==null&&(this.checkerColorB=e.colorB,this.checkerColorBVec.set(n.r/255,n.g/255,n.b/255)),this.syncBackgroundModeUniform(),this.backgroundMaterial.uniforms.uSizeX.value=this.checkerSizeX,this.backgroundMaterial.uniforms.uSizeY.value=this.checkerSizeY,this.render()}getCheckerSettings(){return{mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}}syncBackgroundModeUniform(){this.backgroundMaterial.uniforms.uMode.value=this.backgroundMode===`solid`?2:+(this.checkerMode===`screen`)}getBackgroundSettings(){return{mode:this.backgroundMode,color:this.backgroundColor}}setBackgroundMode(e){this.backgroundMode=e===`solid`?`solid`:`checkerboard`,this.syncBackgroundModeUniform(),this.render()}setBackgroundColor(e){let t=pu(e);t!==null&&(this.backgroundColor=e,this.backgroundColorVec.set(t.r/255,t.g/255,t.b/255),this.render())}applyBackgroundSettings(e){this.backgroundMode=e.mode===`solid`?`solid`:`checkerboard`;let t=pu(e.color);t!==null&&(this.backgroundColor=e.color,this.backgroundColorVec.set(t.r/255,t.g/255,t.b/255)),this.syncBackgroundModeUniform(),this.render()}getGridMinZoom(){return this.gridMinZoom}setGridMinZoom(e){this.gridMinZoom=od(e),this.updateGrid(),this.render()}applyGridMinZoom(e){this.setGridMinZoom(e)}isPixelGridVisible(){return this.gridPlane.visible===!0}getGridPlaneMatrix(){return Array.from(this.gridPlane.matrix.elements)}getLayerPlaneMatrix(e){let t=this.findLayer(e);return t===null?null:Array.from(t.plane.matrix.elements)}getFloatingPlaneMatrix(){return this.floatingPlane===null?null:Array.from(this.floatingPlane.matrix.elements)}getGridState(){let e=this.activeLayer();return{visible:this.gridPlane.visible===!0,minZoom:this.gridMinZoom,layerId:e===null?null:e.id,width:e===null?0:e.width,height:e===null?0:e.height}}updateGrid(){if(this.disposed)return;let e=this.activeLayer();if(e===null){this.gridPlane.visible=!1;return}let t=ld(this.zoom,this.gridMinZoom);this.gridMaterial.uniforms.uLayerW.value=e.width,this.gridMaterial.uniforms.uLayerH.value=e.height,this.gridPlane.visible=t,t&&this.writePlaneMatrix(this.gridPlane,e.width,e.height,e.transform,this.layers.length*.01+.02)}axisOverlaySegments(){let e=this.activeLayer();if(e===null||e.width<1||e.height<1)return null;let t=this.container.getBoundingClientRect();if(t.width<=0||t.height<=0)return null;let n={left:0,top:0,width:t.width,height:t.height},r=this.viewTransform(),i=(t,i)=>{let a=Cu(t,i,e.width,e.height,e.transform),o=Ou(a.x,a.y,n,r);return{x:o.x,y:o.y}},a=i(0,0),o=i(e.width,0),s=i(0,e.height),c=i(e.width,e.height);return{x:{ax:a.x,ay:a.y,bx:o.x,by:o.y},y:{ax:a.x,ay:a.y,bx:s.x,by:s.y},right:{ax:o.x,ay:o.y,bx:c.x,by:c.y},bottom:{ax:s.x,ay:s.y,bx:c.x,by:c.y}}}writeAxisSegments(e,t,n,r,i){let a=t.bx-t.ax,o=t.by-t.ay,s=Math.sqrt(a*a+o*o),c=t.bx,l=t.by,u=0,d=0;if(s>1e-6){let e=a/s,n=o/s,r=Math.min(9,s/3);c=t.bx-e*r,l=t.by-n*r,u=-n*r*.45,d=e*r*.45}let f=(e,t)=>[e-n/2,r/2-t],[p,m]=f(t.ax,t.ay),[h,g]=f(t.bx,t.by),[_,v]=f(c+u,l+d),[y,b]=f(c-u,l-d),x=e.geometry.getAttribute(`position`);x.setXYZ(0,p,m,i),x.setXYZ(1,h,g,i),x.setXYZ(2,_,v,i),x.setXYZ(3,h,g,i),x.setXYZ(4,y,b,i),x.setXYZ(5,h,g,i),x.needsUpdate=!0}writeBorderSegments(e,t,n,r,i,a){let o=(e,t)=>[e-r/2,i/2-t],[s,c]=o(t.ax,t.ay),[l,u]=o(t.bx,t.by),[d,f]=o(n.ax,n.ay),[p,m]=o(n.bx,n.by),h=e.geometry.getAttribute(`position`);h.setXYZ(0,s,c,a),h.setXYZ(1,l,u,a),h.setXYZ(2,d,f,a),h.setXYZ(3,p,m,a),h.setXYZ(4,p,m,a),h.setXYZ(5,p,m,a),h.needsUpdate=!0}updateAxisOverlay(){if(this.disposed)return;let e=this.axisOverlaySegments();if(e===null){this.axisXLine.visible=!1,this.axisYLine.visible=!1,this.borderLine.visible=!1;return}let t=this.container.getBoundingClientRect(),n=Math.max(1,t.width),r=Math.max(1,t.height),i=this.layers.length*.01+.03;this.writeAxisSegments(this.axisXLine,e.x,n,r,i),this.writeAxisSegments(this.axisYLine,e.y,n,r,i),this.writeBorderSegments(this.borderLine,e.right,e.bottom,n,r,i),this.axisXLine.visible=!0,this.axisYLine.visible=!0,this.borderLine.visible=!0}getAxisOverlayState(){let e=this.axisOverlaySegments(),t={ax:0,ay:0,bx:0,by:0};return{visible:e!==null,xAxis:e===null?{...t}:{...e.x},yAxis:e===null?{...t}:{...e.y},rightBorder:e===null?{...t}:{...e.right},bottomBorder:e===null?{...t}:{...e.bottom},xColor:`#${this.axisXMaterial.color.getHexString()}`,yColor:`#${this.axisYMaterial.color.getHexString()}`,borderColor:`#${this.borderMaterial.color.getHexString()}`}}resetView(){let e=this.container.getBoundingClientRect();if(e.width>0&&e.height>0){let t=Math.min(e.width/this.imageWidth,e.height/this.imageHeight);this.zoom=Au(Math.max(1,Math.floor(t)))}else this.zoom=8;this.panX=0,this.panY=0,this.rotation=0,this.flipX=!1,this.flipY=!1,this.layoutScene(),this.render(),this.emitStats()}resetViewTransform(){this.resetView()}dispose(){if(!this.disposed){this.disposed=!0,this.stopFollowLoop(),this.disposeFloatingPlane(),this.scene.remove(this.axisXLine),this.axisXLine.geometry.dispose(),this.axisXMaterial.dispose(),this.scene.remove(this.axisYLine),this.axisYLine.geometry.dispose(),this.axisYMaterial.dispose(),this.scene.remove(this.borderLine),this.borderLine.geometry.dispose(),this.borderMaterial.dispose(),this.resizeObserver.disconnect(),this.lineAnchor=null,this.lastMouseClient=null,this.stabilizerPos=null,this.stabilizerTarget=null,this.previewTip.remove(),this.previewStabilizer.remove(),this.previewSvg.remove();for(let e of this.layers)this.scene.remove(e.plane),e.material.dispose(),e.texture.dispose();this.layers=[],this.scene.remove(this.gridPlane),this.gridMaterial.dispose(),this.scene.remove(this.backgroundPlane),this.backgroundMaterial.dispose(),this.sharedGeometry.dispose(),this.renderer.dispose(),this.renderer.domElement.remove()}}attachEvents(){let e=this.renderer.domElement;e.addEventListener(`pointerdown`,t=>{if(t.button===1&&(this.tool===`loupe`||this.tool===`transform`)){if(t.preventDefault(),t.altKey){if(this.tool===`loupe`)this.resetViewTransform();else{let e=this.activeLayer();e!==null&&this.resetLayerTransform(e.id)}}else if(this.tool===`loupe`)t.shiftKey?this.setFlip(this.flipX,!this.flipY):this.setFlip(!this.flipX,this.flipY);else{let e=this.activeLayer();e!==null&&(t.shiftKey?this.setLayerTransform(e.id,{flipY:!e.transform.flipY}):this.setLayerTransform(e.id,{flipX:!e.transform.flipX}))}return}if(t.button===1||this.spaceDown){this.panning=!0,e.setPointerCapture(t.pointerId);return}if(t.button===2&&(this.tool===`loupe`||this.tool===`transform`)){let n=this.tool===`loupe`?this.pointerAngle(t.clientX,t.clientY):this.layerPointerAngle(t.clientX,t.clientY);if(n===null)return;this.tool===`loupe`?(this.rotating=!0,this.lastPointerAngle=n):(this.transformRotating=!0,this.transformLastAngle=n),e.setPointerCapture(t.pointerId);return}if(t.button!==0)return;if(t.shiftKey&&(this.tool===`pencil`||this.tool===`line`||this.tool===`curve`)){let n=this.tool===`pencil`?this.brushSize:this.tool===`line`?this.lineWidth:this.curveWidth;this.sizeDrag={tool:this.tool,startClientX:t.clientX,startSize:n},e.setPointerCapture(t.pointerId);return}if(this.tool===`transform`){let n=this.activeLayer();if(n===null)return;let r=this.layerHitTest(t.clientX,t.clientY);if(r!==null&&this.beginLayerGesture(r,t)){this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews();return}this.transforming=!0,this.transformStart={clientX:t.clientX,clientY:t.clientY,x:n.transform.x,y:n.transform.y},e.setPointerCapture(t.pointerId);return}if(this.tool===`transform3d`||this.tool===`destransform3d`){if(this.tool===`destransform3d`){let e=this.floating;if((e===null||!e.active)&&(this.activeLayer()===null||this.toImagePixel(t.clientX,t.clientY)===null||!this.cutAllToFloating()))return}else if(this.activeLayer()===null)return;let n=this.rot3DHitTest(t.clientX,t.clientY);n!==null&&this.beginRot3DGesture(n,t)&&(this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews());return}if(this.tool===`loupe`){this.loupeZooming=!0,this.loupeAnchor={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId);return}if(this.tool===`bucket`){let e=this.activeLayer();if(e===null||this.ensureCellContent(e.id,this.currentFrame)===null)return;this.syncLayerRender(e),this.refreshLayerStacking();let n=this.toImagePixel(t.clientX,t.clientY);if(n===null)return;this.bucketFillAt(n.x,n.y);return}if(this.tool===`eyedropper`){this.pickColorAt(t.clientX,t.clientY);return}if(this.tool===`rectselect`){if(this.activeLayer()===null)return;let n=this.toImagePixel(t.clientX,t.clientY);if(n===null)return;this.rectDrag={x0:n.x,y0:n.y,x1:n.x,y1:n.y},this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews();return}if(this.tool===`line`){let e=this.activeLayer();if(e===null||this.ensureCellContent(e.id,this.currentFrame)===null)return;this.syncLayerRender(e),this.refreshLayerStacking();let n=this.toImagePixel(t.clientX,t.clientY);if(n===null)return;if(this.lineAnchor===null){this.lineAnchor={x:n.x,y:n.y,clientX:t.clientX,clientY:t.clientY},this.lastMouseClient={x:t.clientX,y:t.clientY},this.updatePreviews();return}this.commitLineTo(n.x,n.y);return}if(this.tool===`curve`){let n=this.activeLayer();if(n===null)return;if(this.curvePhase===`awaitC2`){let e=this.clientToLayerImageFloat(t.clientX,t.clientY);if(e===null||(this.lastMouseClient={x:t.clientX,y:t.clientY},this.ensureCellContent(n.id,this.currentFrame)===null))return;this.syncLayerRender(n),this.refreshLayerStacking(),this.commitCurveTo(e.x,e.y);return}if(this.curvePhase===`awaitC1`){let e=this.clientToLayerImageFloat(t.clientX,t.clientY);if(e===null)return;this.curveC1={x:e.x,y:e.y,clientX:t.clientX,clientY:t.clientY},this.lastMouseClient={x:t.clientX,y:t.clientY},this.curvePhase=`awaitC2`,this.updatePreviews();return}if(this.curvePhase===`idle`){if(this.ensureCellContent(n.id,this.currentFrame)===null)return;this.syncLayerRender(n),this.refreshLayerStacking();let r=this.toImagePixel(t.clientX,t.clientY);if(r===null)return;this.curveP0={x:r.x,y:r.y,clientX:t.clientX,clientY:t.clientY},this.curveDragCurrent={x:r.x,y:r.y,clientX:t.clientX,clientY:t.clientY},this.curveP3=null,this.curveC1=null,this.curvePhase=`dragging`,this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews();return}return}if(this.tool===`destransform`){let n=this.floating;if(n!==null&&n.active){if(this.floatingHomeVisible()){let r=this.selectionHitTest(t.clientX,t.clientY);if(r!==null&&this.beginSelectionGesture(r,t)){this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews();return}if(r===null){let r=this.clientToSelectionLocal(t.clientX,t.clientY),i=this.clientToLayerImageFloat(t.clientX,t.clientY);r!==null&&i!==null&&r.x>=0&&r.x<=n.width&&r.y>=0&&r.y<=n.height&&(this.moveDrag={grabDX:i.x-n.cx,grabDY:i.y-n.cy},this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews())}}return}if(this.activeLayer()===null)return;let r=this.clientToLayerImageFloat(t.clientX,t.clientY);if(r===null||this.toImagePixel(t.clientX,t.clientY)===null||!this.cutAllToFloating())return;let i=this.floating;if(i===null)return;this.moveDrag={grabDX:r.x-i.cx,grabDY:r.y-i.cy},this.lastMouseClient={x:t.clientX,y:t.clientY},e.setPointerCapture(t.pointerId),this.updatePreviews();return}let n=this.activeLayer();if(n===null)return;let r=this.ensureCellContent(n.id,this.currentFrame);if(r===null)return;if(this.syncLayerRender(n),this.refreshLayerStacking(),this.lastMouseClient={x:t.clientX,y:t.clientY},this.isStabilizing()){if(this.toImagePixel(t.clientX,t.clientY)===null)return;let i=this.clientToLayerImageFloat(t.clientX,t.clientY);if(i===null)return;let a=r.texture;this.drawing=!0,e.setPointerCapture(t.pointerId),this.lastPixel=null,this.stabilizerPos={x:i.x,y:i.y},this.stabilizerTarget={x:i.x,y:i.y},this.strokeBase=a.buffer.slice(),this.strokeLayerId=a.id,this.accumulate||(this.strokeMask=new Uint8Array(a.width*a.height)),this.resetPencilPixelPerfect(),this.paintStabilizedSegment(a,n.lockedChannels,this.stabilizerPos,this.stabilizerPos),this.markTextureViewsDirty(a.id),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats(),this.updatePreviews();return}let i=this.toImagePixel(t.clientX,t.clientY);if(i===null)return;let a=r.texture;this.drawing=!0,e.setPointerCapture(t.pointerId),this.lastPixel=i,this.strokeBase=a.buffer.slice(),this.strokeLayerId=a.id,this.accumulate||(this.strokeMask=new Uint8Array(a.width*a.height)),this.resetPencilPixelPerfect(),this.paintPencilLine(a,n.lockedChannels,i.x,i.y,i.x,i.y),this.markTextureViewsDirty(a.id),this.render(),this.onPixelsChanged(),this.onLayersChanged?.(),this.emitStats()}),e.addEventListener(`pointermove`,e=>{let t=this.toImagePixel(e.clientX,e.clientY);if(this.cursor=t,this.lastMouseClient={x:e.clientX,y:e.clientY},this.tool===`curve`&&this.curvePhase===`dragging`&&t!==null&&(this.curveDragCurrent={x:t.x,y:t.y,clientX:e.clientX,clientY:e.clientY}),this.updatePreviews(),this.trackballDrag!==null||this.axisDrag!==null)this.updateRot3DGesture(e.clientX,e.clientY);else if(this.rot3dCenterTap!==null){let t=e.clientX-this.rot3dCenterTap.startClientX,n=e.clientY-this.rot3dCenterTap.startClientY;if(t*t+n*n>=16){let t=this.rot3dCenterTap;this.rot3dCenterTap=null;let n=this.rot3DStartAngle(t.target,t.layerId,`x`),r=this.rot3DStartAngle(t.target,t.layerId,`y`);if(n===null||r===null)return;this.trackballDrag={target:t.target,layerId:t.layerId,startRotationX:n,startRotationY:r,grabClientX:t.startClientX,grabClientY:t.startClientY,radiusPx:t.radiusPx},this.updateRot3DGesture(e.clientX,e.clientY)}}else if(this.layerResizeDrag!==null||this.layerRotateDrag!==null||this.layerSkewDrag!==null)this.updateLayerGesture(e.clientX,e.clientY);else{if(this.layerCenterTap!==null){let t=e.clientX-this.layerCenterTap.startClientX,n=e.clientY-this.layerCenterTap.startClientY;if(t*t+n*n>=16){let e=this.activeLayer();if(e===null||e.id!==this.layerCenterTap.layerId)this.layerCenterTap=null;else{let t=this.layerCenterTap.startClientX,n=this.layerCenterTap.startClientY;this.layerCenterTap=null,this.transforming=!0,this.transformStart={clientX:t,clientY:n,x:e.transform.x,y:e.transform.y}}}else return}if(this.layerFlipTap!==null){let t=e.clientX-this.layerFlipTap.startClientX,n=e.clientY-this.layerFlipTap.startClientY;if(t*t+n*n>=16)this.layerFlipTap=null;else return}if(this.transformRotating){let t=this.layerPointerAngle(e.clientX,e.clientY);if(t!==null&&this.transformLastAngle!==null){let e=t-this.transformLastAngle;e>Math.PI?e-=Math.PI*2:e<-Math.PI&&(e+=Math.PI*2);let n=this.activeLayer();n!==null&&(this.setLayerTransform(n.id,{rotation:n.transform.rotation+e}),this.transformLastAngle=t)}}else if(this.transforming&&this.transformStart!==null){let t=this.activeLayer();if(t===null)return;let n=Math.cos(this.rotation),r=Math.sin(this.rotation),i=e.clientX-this.transformStart.clientX,a=e.clientY-this.transformStart.clientY,o=(n*i+r*a)/this.zoom,s=(-r*i+n*a)/this.zoom;this.setLayerTransform(t.id,{x:this.transformStart.x+o/(this.flipX?-1:1),y:this.transformStart.y+s/(this.flipY?-1:1)})}else if(this.rotating){let t=this.pointerAngle(e.clientX,e.clientY);if(t!==null&&this.lastPointerAngle!==null){let e=t-this.lastPointerAngle;e>Math.PI?e-=Math.PI*2:e<-Math.PI&&(e+=Math.PI*2),this.setRotation(this.rotation+e),this.lastPointerAngle=t}}else if(this.loupeZooming&&this.loupeAnchor!==null){let t=e.movementX-e.movementY;t!==0&&this.zoomAtPoint(this.loupeAnchor.x,this.loupeAnchor.y,1+t*.004)}else if(this.panning)this.panX+=e.movementX,this.panY+=e.movementY,this.layoutScene(),this.render(),this.emitStats();else if(this.rectDrag!==null){let t=this.clientToLayerImageFloat(e.clientX,e.clientY);t!==null&&(this.rectDrag.x1=Math.floor(t.x),this.rectDrag.y1=Math.floor(t.y),this.lastMouseClient={x:e.clientX,y:e.clientY},this.updatePreviews())}else if(this.resizeDrag!==null||this.rotateDrag!==null||this.skewDrag!==null)this.updateTransformGesture(e.clientX,e.clientY);else{if(this.centerTap!==null){let t=e.clientX-this.centerTap.startClientX,n=e.clientY-this.centerTap.startClientY;if(t*t+n*n>=16)this.moveDrag={grabDX:this.centerTap.grabDX,grabDY:this.centerTap.grabDY},this.centerTap=null;else return}if(this.flipTap!==null){let t=e.clientX-this.flipTap.startClientX,n=e.clientY-this.flipTap.startClientY;if(t*t+n*n>=16)this.flipTap=null;else return}if(this.moveDrag!==null){let t=this.floating;if(t===null||!t.active||!this.floatingHomeVisible())this.moveDrag=null;else{let n=this.clientToLayerImageFloat(e.clientX,e.clientY);n!==null&&(t.cx=n.x-this.moveDrag.grabDX,t.cy=n.y-this.moveDrag.grabDY,this.lastMouseClient={x:e.clientX,y:e.clientY},this.syncFloatingPlane(),this.render(),this.updatePreviews())}}else if(this.sizeDrag!==null){let t=Ql(this.sizeDrag.startSize+(e.clientX-this.sizeDrag.startClientX)/20);this.sizeDrag.tool===`pencil`?this.setBrushSize(t)&&this.onToolSizeChanged?.(`brush`,t):this.sizeDrag.tool===`line`?this.setLineWidth(t)&&this.onToolSizeChanged?.(`line`,t):this.setCurveWidth(t)&&this.onToolSizeChanged?.(`curve`,t)}else if(this.tool===`pencil`&&this.stabilizerMode!==`none`){let t=this.clientToLayerImageFloat(e.clientX,e.clientY);if(t!==null){if(this.stabilizerPos===null)this.stabilizerPos={x:t.x,y:t.y},this.stabilizerTarget={x:t.x,y:t.y},this.updatePreviews();else{this.stabilizerTarget={x:t.x,y:t.y};let e=this.stabilizerStep(this.stabilizerPos,this.stabilizerTarget);if(Gu(this.stabilizerPos,e)>1e-9){let t=this.stabilizerPos;if(this.stabilizerPos=e,this.drawing&&this.strokeLayerId!==null){let n=this.activeLayer(),r=this.strokeLayerId===null?void 0:this.textures.get(this.strokeLayerId);n!==null&&r!==void 0&&(this.paintStabilizedSegment(r,n.lockedChannels,t,e),this.markTextureViewsDirty(r.id),this.render(),this.onPixelsChanged())}this.updatePreviews()}else this.updatePreviews()}this.stabilizerMode===`follow`&&this.ensureFollowLoop()}this.emitStats()}else{if(this.drawing&&this.lastPixel!==null&&t!==null){let e=this.activeLayer();if(e===null||this.strokeLayerId===null)return;let n=this.textures.get(this.strokeLayerId);if(n===void 0)return;this.paintPencilLine(n,e.lockedChannels,this.lastPixel.x,this.lastPixel.y,t.x,t.y),this.lastPixel=t,this.markTextureViewsDirty(n.id),this.render(),this.onPixelsChanged()}this.emitStats()}}}});let t=()=>{if(this.strokeBase!==null&&this.strokeLayerId!==null){let e=this.textures.get(this.strokeLayerId);if(e!==void 0){let t=zf(this.strokeBase,e.buffer,e.width,e.height);t!==null&&this.pushHistory({type:`stroke`,layerId:e.id,diff:t})}this.strokeBase=null,this.strokeLayerId=null,this.strokeMask=null}this.drawing=!1,this.panning=!1,this.rotating=!1,this.loupeZooming=!1,this.transforming=!1,this.transformRotating=!1,this.lastPointerAngle=null,this.transformLastAngle=null,this.transformStart=null,this.loupeAnchor=null,this.lastPixel=null,this.sizeDrag=null,this.clearTransformDrags(),this.resetPencilPixelPerfect(),this.stabilizerMode===`follow`&&this.ensureFollowLoop(),this.updatePreviews()};e.addEventListener(`pointerup`,t),e.addEventListener(`pointerup`,e=>{if(this.centerTap!==null){this.centerTap=null,e.button===0&&this.resetFloatingTransform();return}if(this.flipTap!==null){let t=this.flipTap.axis;if(this.flipTap=null,e.button===0){let e=this.floating;e!==null&&e.active&&(t===`x`?e.flipX=!e.flipX:e.flipY=!e.flipY,this.afterFloatingChange())}return}if(this.layerCenterTap!==null){let t=this.layerCenterTap.layerId;this.layerCenterTap=null,e.button===0&&this.resetLayerTransform(t);return}if(this.layerFlipTap!==null){let t=this.layerFlipTap;if(this.layerFlipTap=null,e.button===0){let e=this.findLayer(t.layerId);e!==null&&this.setLayerTransform(t.layerId,t.axis===`x`?{flipX:!e.transform.flipX}:{flipY:!e.transform.flipY})}return}if(this.rot3dCenterTap!==null){let t=this.rot3dCenterTap;this.rot3dCenterTap=null,e.button===0&&this.resetRot3DAngles(t.target,t.layerId);return}if(this.rectDrag!==null&&e.button===0){let e=this.rectDrag;this.rectDrag=null,this.cutRectToFloating(e.x0,e.y0,e.x1,e.y1);return}if(this.tool!==`curve`||this.curvePhase!==`dragging`||e.button!==0)return;let t=this.toImagePixel(e.clientX,e.clientY);if(t!==null)this.curveP3={x:t.x,y:t.y,clientX:e.clientX,clientY:e.clientY};else if(this.curveDragCurrent!==null)this.curveP3={...this.curveDragCurrent};else return;this.curvePhase=`awaitC1`,this.curveDragCurrent=null,this.lastMouseClient={x:e.clientX,y:e.clientY},this.updatePreviews()}),e.addEventListener(`pointercancel`,t),e.addEventListener(`pointercancel`,()=>{this.centerTap=null,this.flipTap=null,this.layerCenterTap=null,this.layerFlipTap=null,this.rot3dCenterTap=null,this.rectDrag!==null&&(this.rectDrag=null,this.updatePreviews()),this.tool===`curve`&&this.curvePhase===`dragging`&&(this.resetCurveState(),this.updatePreviews())}),e.addEventListener(`pointerleave`,()=>{this.cursor=null,this.lastMouseClient=null,this.stabilizerPos=null,this.stabilizerTarget=null,this.stopFollowLoop(),this.resetPencilPixelPerfect(),this.hidePreviews(),this.emitStats()}),e.addEventListener(`wheel`,e=>{e.preventDefault(),this.zoomAtPoint(e.clientX,e.clientY,e.deltaY<0?1.25:.8)},{passive:!1}),e.addEventListener(`contextmenu`,e=>{e.preventDefault()}),window.addEventListener(`keydown`,e=>{if(e.code===`Space`){this.spaceDown=!0;return}let t=(()=>{if(typeof e.composedPath==`function`){for(let t of e.composedPath())if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t instanceof HTMLElement&&t.isContentEditable)return!0}let t=e.target;return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement})();if(e.key===`Control`&&!e.repeat&&!e.altKey&&!e.metaKey&&!t)this.beginTempEyedropper();else{if(!e.ctrlKey&&!e.altKey&&!e.metaKey&&!t){if((e.key===`Enter`||e.key===`Return`||e.key===`Escape`)&&this.hasFloatingSelection()){this.commitFloating();return}if(e.key===`b`||e.key===`B`){this.setTool(`pencil`);return}if(e.key===`g`||e.key===`G`||e.key===`f`||e.key===`F`){this.setTool(`bucket`);return}if(e.key===`n`||e.key===`N`){this.setTool(`line`);return}if(e.key===`c`||e.key===`C`){this.setTool(`curve`);return}if(e.key===`z`||e.key===`Z`){this.setTool(`loupe`);return}if(e.key===`r`||e.key===`R`){this.setTool(`rectselect`);return}if(e.key===`v`||e.key===`V`){this.setTool(`destransform`);return}if(e.key===`t`||e.key===`T`){this.setTool(`transform`);return}if(e.key===`y`||e.key===`Y`){this.setTool(`transform3d`);return}if(e.key===`u`||e.key===`U`){this.setTool(`destransform3d`);return}if(e.code===`Digit4`||e.code===`Numpad4`){this.rotateByDegrees(-this.rotationStepDeg);return}if(e.code===`Digit6`||e.code===`Numpad6`){this.rotateByDegrees(this.rotationStepDeg);return}if(e.code===`Digit5`||e.code===`Numpad5`){this.resetRotation();return}if(e.code===`Digit1`){this.setZoom(1);return}if(e.code===`Digit2`){this.zoomToFit();return}if(e.key===`Escape`&&this.tool===`line`&&this.lineAnchor!==null){this.lineAnchor=null,this.updatePreviews();return}if(e.key===`Escape`&&this.tool===`curve`&&this.curvePhase!==`idle`){this.resetCurveState(),this.updatePreviews();return}if(e.key===`Escape`&&this.tool===`rectselect`&&this.rectDrag!==null){this.rectDrag=null,this.updatePreviews();return}if(e.key===`Delete`){e.preventDefault(),this.clearCurrentCellTexture();return}}if(e.ctrlKey&&!e.altKey&&!e.metaKey&&!t){let t=e.key.toLowerCase();if(t===`z`&&!e.shiftKey){e.preventDefault(),this.undo();return}if(t===`y`||t===`z`&&e.shiftKey){e.preventDefault(),this.redo();return}}if(e.ctrlKey&&e.altKey&&!e.metaKey){if(t)return;e.key===`+`||e.key===`=`||e.code===`Equal`||e.code===`NumpadAdd`?(e.preventDefault(),this.zoomBy(1.25)):(e.key===`-`||e.code===`Minus`||e.code===`NumpadSubtract`)&&(e.preventDefault(),this.zoomBy(.8))}}}),window.addEventListener(`keyup`,e=>{e.code===`Space`&&(this.spaceDown=!1,this.panning=!1),e.key===`Control`&&this.endTempEyedropper()})}toImagePixel(e,t){let n=this.activeLayer();if(n===null||n.width<1||n.height<1||n.renderTextureId===null)return null;let r=this.renderer.domElement.getBoundingClientRect();return ku(e,t,{left:r.left,top:r.top,width:r.width,height:r.height},n.width,n.height,this.viewTransform(),n.transform)}pointerAngle(e,t){let n=this.renderer.domElement.getBoundingClientRect(),r=e-(n.left+n.width/2+this.panX),i=t-(n.top+n.height/2+this.panY);return Math.abs(r)<1&&Math.abs(i)<1?null:Math.atan2(i,r)}layerPointerAngle(e,t){let n=this.activeLayer();if(n===null)return null;let r=this.renderer.domElement.getBoundingClientRect(),i=Ou(n.transform.x,n.transform.y,{left:r.left,top:r.top,width:r.width,height:r.height},this.viewTransform()),a=e-i.x,o=t-i.y;return Math.abs(a)<1&&Math.abs(o)<1?null:Math.atan2(o,a)}layout(){let e=this.container.getBoundingClientRect(),t=Math.max(1,Math.floor(e.width)),n=Math.max(1,Math.floor(e.height)),r=Math.min(2,window.devicePixelRatio||1);this.renderer.setPixelRatio(r),this.backgroundMaterial.uniforms.uPixelRatio.value=r,this.renderer.setSize(t,n,!1),this.layoutScene(),this.render(),this.updatePreviews()}layoutScene(){let e=this.container.getBoundingClientRect(),t=Math.max(1,e.width),n=Math.max(1,e.height);this.camera.left=-t/2,this.camera.right=t/2,this.camera.top=n/2,this.camera.bottom=-n/2,this.camera.updateProjectionMatrix(),this.layoutSceneTransforms()}viewTransform(){return{zoom:this.zoom,panX:this.panX,panY:this.panY,rotation:this.rotation,flipX:this.flipX,flipY:this.flipY}}writePlaneMatrix(e,t,n,r,i){let a=this.container.getBoundingClientRect(),o=Math.max(1,a.width),s=Math.max(1,a.height),c={left:0,top:0,width:o,height:s},l=this.viewTransform(),u=(e,i)=>{let a=Cu((e+.5)*t,(.5-i)*n,t,n,r);return Ou(a.x,a.y,c,l)},d=u(0,0),f=u(1,0),p=u(0,1),m=e.matrix.elements;m[0]=f.x-d.x,m[1]=-(f.y-d.y),m[2]=0,m[3]=0,m[4]=p.x-d.x,m[5]=-(p.y-d.y),m[6]=0,m[7]=0,m[8]=0,m[9]=0,m[10]=1,m[11]=0,m[12]=d.x-o/2,m[13]=s/2-d.y,m[14]=i,m[15]=1,e.matrixWorldNeedsUpdate=!0}layoutSceneTransforms(){for(let e=0;e<this.layers.length;e+=1){let t=this.layers[e];t!==void 0&&this.writePlaneMatrix(t.plane,t.width,t.height,t.transform,e*.01)}this.writePlaneMatrix(this.backgroundPlane,this.imageWidth,this.imageHeight,yu,-.02),this.updateGrid(),this.syncFloatingPlane(),this.updateAxisOverlay()}render(){this.disposed||this.renderer.render(this.scene,this.camera)}emitStats(){this.onStats({width:this.imageWidth,height:this.imageHeight,zoom:this.zoom,rotationDeg:Math.round(this.rotation*180/Math.PI),flipX:this.flipX,flipY:this.flipY,canUndo:this.history.canUndo(),canRedo:this.history.canRedo(),cursorX:this.cursor===null?null:this.cursor.x,cursorY:this.cursor===null?null:this.cursor.y})}readPixel(e,t){let n=this.activeLayer();return n===null?null:ql(n.buffer,n.width,n.height,e,t)}},$f=`GnumarusPaintingAndAnimationApp`,ep=`project.json`,$=class extends Error{constructor(e){super(e),this.name=`GnumarusProjectError`}};function tp(e){return`textures/${e}.png`}function np(e){return JSON.stringify(e,null,2)}function rp(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function ip(e){if(!rp(e))return{...yu};let{x:t,y:n,rotation:r,flipX:i,flipY:a,scaleX:o,scaleY:s,skewX:c,skewY:l,rotationX:u,rotationY:d}=e,f=typeof o==`number`&&Number.isFinite(o)&&o>0?o:1,p=typeof s==`number`&&Number.isFinite(s)&&s>0?s:1,m=typeof c==`number`&&Number.isFinite(c)?c:0,h=typeof l==`number`&&Number.isFinite(l)?l:0,g=typeof u==`number`&&Number.isFinite(u)?u:0,_=typeof d==`number`&&Number.isFinite(d)?d:0;return{x:typeof t==`number`&&Number.isFinite(t)?t:0,y:typeof n==`number`&&Number.isFinite(n)?n:0,rotation:typeof r==`number`&&Number.isFinite(r)?r:0,flipX:i===!0,flipY:a===!0,scaleX:f,scaleY:p,skewX:m,skewY:h,rotationX:g,rotationY:_}}function ap(e,t){if(typeof e!=`string`||e.length===0)throw new $(`project.json has an invalid ${t} id`);return e}function op(e,t){if(typeof e!=`string`||e.length===0)throw new $(`project.json has an invalid ${t} name`);return e}function sp(e,t){if(!rp(e))throw new $(`project.json has an invalid animation section`);let{frames:n,currentFrame:r,defaultFrameDuration:i,frameDurations:a,frameNames:o,textures:s,contents:c,cells:l}=e;if(!Number.isInteger(n)||n<1)throw new $(`project.json has an invalid frame count`);let u=n,d=0;if(r!==void 0){if(!Number.isInteger(r))throw new $(`project.json has an invalid current frame`);d=Math.min(u-1,Math.max(0,r))}if(!Array.isArray(s))throw new $(`project.json has invalid textures`);let f=[],p=new Set;for(let e of s){if(!rp(e))throw new $(`project.json has an invalid texture`);let t=ap(e.id,`texture`);if(p.has(t))throw new $(`project.json has duplicate texture ids`);p.add(t);let{name:n,width:r,height:i,file:a}=e;if(typeof r!=`number`||!Number.isInteger(r)||r<1||typeof i!=`number`||!Number.isInteger(i)||i<1)throw new $(`project.json has a texture with invalid dimensions`);if(typeof a!=`string`||a.length===0)throw new $(`project.json has a texture with an invalid file`);f.push({id:t,name:op(n,`texture`),width:r,height:i,file:a})}if(!Array.isArray(c))throw new $(`project.json has invalid contents`);let m=[],h=new Set;for(let e of c){if(!rp(e))throw new $(`project.json has an invalid cell content`);let t=ap(e.id,`content`);if(h.has(t))throw new $(`project.json has duplicate content ids`);h.add(t);let{name:n,textureId:r,transform:i}=e;if(r!=null&&typeof r!=`string`)throw new $(`project.json has a content with an invalid texture reference`);let a=r===void 0?null:r;if(a!==null&&!p.has(a))throw new $(`project.json has a content with an unknown texture`);m.push({id:t,name:op(n,`content`),textureId:a,transform:ip(i)})}if(!Array.isArray(l))throw new $(`project.json has invalid cells`);let g=[],_=new Set;for(let e of l){if(!rp(e))throw new $(`project.json has an invalid matrix cell`);let{layer:n,frame:r,content:i}=e;if(typeof n!=`string`||!t.has(n))throw new $(`project.json has a cell with an unknown layer`);if(!Number.isInteger(r)||r<0||r>=u)throw new $(`project.json has a cell with an invalid frame`);if(typeof i!=`string`||!h.has(i))throw new $(`project.json has a cell with an unknown content`);let a=`${n}\n${r}`;if(_.has(a))throw new $(`project.json has a duplicated matrix cell`);_.add(a),g.push({layer:n,frame:r,content:i})}let v=100;if(i!==void 0){if(typeof i!=`number`||!Number.isFinite(i))throw new $(`project.json has an invalid default frame duration`);v=yd(i)}let y=[];if(a!==void 0){if(!Array.isArray(a))throw new $(`project.json has invalid frame durations`);let e=new Set;for(let t of a){if(!rp(t))throw new $(`project.json has an invalid frame duration`);let{frame:n,duration:r}=t;if(!Number.isInteger(n)||n<0||n>=u)throw new $(`project.json has a frame duration with an invalid frame`);if(typeof r!=`number`||!Number.isFinite(r))throw new $(`project.json has a frame duration with an invalid duration`);if(e.has(n))throw new $(`project.json has a duplicated frame duration`);e.add(n),y.push({frame:n,duration:yd(r)})}y.sort((e,t)=>e.frame-t.frame)}let b;if(o===void 0)b=Od(u);else{if(!Array.isArray(o)||o.length!==u)throw new $(`project.json has invalid frame names`);b=[];for(let e of o){if(typeof e!=`string`||Dd(e)===null)throw new $(`project.json has an invalid frame name`);b.push(e.trim().slice(0,64))}}return{frames:u,currentFrame:d,defaultFrameDuration:v,frameDurations:y,frameNames:b,textures:f,contents:m,cells:g}}function cp(e,t,n){let r=[],i=[],a=[];return e.forEach((e,o)=>{let s=e.width!==void 0&&e.width>=1?Math.floor(e.width):t,c=e.height!==void 0&&e.height>=1?Math.floor(e.height):n,l=e.cells?.[0];r.push({id:e.id,name:`Texture ${o+1}`,width:s,height:c,file:l?.file??tp(e.id)});let u=`content${o+1}`;i.push({id:u,name:`Content ${o+1}`,textureId:e.id,transform:e.transform===void 0?{...yu}:{...e.transform}}),a.push({layer:e.id,frame:0,content:u})}),{frames:1,currentFrame:0,defaultFrameDuration:100,frameDurations:[],frameNames:[Ed(0)],textures:r,contents:i,cells:a}}function lp(e){let t;try{t=JSON.parse(e)}catch{throw new $(`project.json is not valid JSON`)}if(!rp(t))throw new $(`project.json root must be an object`);let{app:n,version:r,width:i,height:a,layers:o,animation:s}=t;if(n!==`GnumarusPaintingAndAnimationApp`)throw new $(`project.json app id mismatch`);if(r!==1)throw new $(`unsupported project version`);if(typeof i!=`number`||typeof a!=`number`||i<1||a<1)throw new $(`project.json has invalid dimensions`);let c=Math.floor(i),l=Math.floor(a);if(!Array.isArray(o)||o.length===0)throw new $(`project.json has no layers`);let u=new Set,d=o.map(e=>{if(!rp(e))throw new $(`project.json has an invalid layer`);let{id:t,name:n,visible:r,opacity:i,width:a,height:o,transform:s,lockedChannels:c,cells:l}=e;if(typeof t!=`string`||typeof n!=`string`)throw new $(`project.json has a layer with invalid id/name`);if(u.has(t))throw new $(`project.json has duplicate layer ids`);if(u.add(t),typeof r!=`boolean`||typeof i!=`number`)throw new $(`project.json has a layer with invalid flags`);let d={id:t,name:n,visible:r,opacity:i,lockedChannels:Ll(c)};if(typeof a==`number`&&a>=1)d.width=Math.floor(a);else if(a!==void 0)throw new $(`project.json has a layer with invalid dimensions`);if(typeof o==`number`&&o>=1)d.height=Math.floor(o);else if(o!==void 0)throw new $(`project.json has a layer with invalid dimensions`);if(s!==void 0&&(d.transform=ip(s)),l!==void 0){if(!Array.isArray(l))throw new $(`project.json has a layer with an invalid cell list`);d.cells=l.map(e=>{if(!rp(e)||typeof e.frame!=`number`||typeof e.file!=`string`)throw new $(`project.json has an invalid cell`);return{frame:e.frame,file:e.file}})}return d}),f=s===void 0?cp(d,c,l):sp(s,u);return{app:$f,version:1,width:Math.floor(i),height:Math.floor(a),layers:d,animation:f}}function up(){return window}function dp(){return typeof up().showDirectoryPicker==`function`}function fp(){return typeof up().showOpenFilePicker==`function`}async function pp(){let e=up().showDirectoryPicker;if(e===void 0)throw Error(`File System Access API is only available in Chromium derivatives.`);return e.call(window,{mode:`readwrite`})}async function mp(){let e=up().showOpenFilePicker;if(e===void 0)throw Error(`File System Access API is only available in Chromium derivatives.`);return(await e.call(window,{multiple:!1,types:[{description:`Aseprite files`,accept:{"application/octet-stream":[`.ase`,`.aseprite`]}}]}))[0]??null}async function hp(e,t,n){let r=t.split(`/`).filter(e=>e.length>0),i=r.pop();if(i===void 0)throw Error(`Invalid project path: ${t}`);let a=e;for(let e of r)a=await a.getDirectoryHandle(e,{create:n});return a.getFileHandle(i,{create:n})}async function gp(e){let t=lp(await(await(await hp(e,ep,!1)).getFile()).text()),n=new Map;for(let r of t.animation.textures){if(n.has(r.file))continue;let t=await(await(await hp(e,r.file,!1)).getFile()).arrayBuffer();n.set(r.file,new Blob([t],{type:`image/png`}))}for(let r of t.layers)for(let t of r.cells??[]){if(n.has(t.file))continue;let r=await(await(await hp(e,t.file,!1)).getFile()).arrayBuffer();n.set(t.file,new Blob([r],{type:`image/png`}))}return{project:t,fileBlobs:n}}async function _p(e,t,n){let r=await(await hp(e,ep,!0)).createWritable();try{await r.write(np(t))}finally{await r.close()}for(let[t,r]of n){let n=await(await hp(e,t,!0)).createWritable();try{await n.write(r)}finally{await n.close()}}}var vp={durationSec:1},yp=`gnumarus.settings.toast.v1`,bp=.5,xp=class extends Error{constructor(e){super(e),this.name=`GnumarusToastSettingsError`}};function Sp(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function Cp(e){return Number.isFinite(e)?Math.min(2,Math.max(bp,e)):vp.durationSec}function wp(e){let t;try{t=JSON.parse(e)}catch{throw new xp(`toast settings are not valid JSON`)}if(!Sp(t))throw new xp(`toast settings root must be an object`);let{durationSec:n,durationMs:r}=t,i=null;if(typeof n==`number`?i=n:typeof r==`number`&&(i=r/1e3),i===null)throw new xp(`toast settings have invalid fields`);return{durationSec:Cp(i)}}function Tp(e){return JSON.stringify({durationSec:Cp(e.durationSec)},null,2)}var Ep={alphaThreshold:0},Dp=`gnumarus.settings.fit.v1`,Op=class extends Error{constructor(e){super(e),this.name=`GnumarusFitSettingsError`}};function kp(e){return typeof e==`object`&&!!e&&!Array.isArray(e)}function Ap(e){return Number.isFinite(e)?Math.min(254,Math.max(0,Math.floor(e))):Ep.alphaThreshold}function jp(e){let t;try{t=JSON.parse(e)}catch{throw new Op(`fit settings are not valid JSON`)}if(!kp(t))throw new Op(`fit settings root must be an object`);let{alphaThreshold:n}=t;if(typeof n!=`number`)throw new Op(`fit settings have invalid fields`);return{alphaThreshold:Ap(n)}}function Mp(e){return JSON.stringify({alphaThreshold:Ap(e.alphaThreshold)},null,2)}var Np=16;function Pp(e){return Number.isFinite(e)?Math.min(128,Math.max(1,Math.floor(e))):Np}function Fp(e,t,n,r){if(r.mode===`solid`){let t=pu(r.color);if(t===null)return;for(let n=0;n<e.length;n+=4)e[n]=t.r,e[n+1]=t.g,e[n+2]=t.b,e[n+3]=255;return}let i=pu(r.colorA),a=pu(r.colorB);if(i===null||a===null)return;let o=Pp(r.sizeX),s=Pp(r.sizeY);for(let r=0;r<n;r+=1){let c=Math.floor((n-1-r)/s)%2,l=r*t*4;for(let n=0;n<t;n+=1){let t=(Math.floor(n/o)+c)%2==0?i:a,r=l+n*4;e[r]=t.r,e[r+1]=t.g,e[r+2]=t.b,e[r+3]=255}}}function Ip(e,t,n,r){let i=Math.max(1,Math.floor(e)),a=Math.max(1,Math.floor(t)),o=new Uint8ClampedArray(i*a*4);r!==void 0&&Fp(o,i,a,r);let s=[];for(let e of n){if(!e.visible||!Number.isInteger(e.width)||!Number.isInteger(e.height)||e.width<1||e.height<1||e.buffer.length!==e.width*e.height*4)continue;let t=Math.min(1,Math.max(0,e.opacity));t<=0||s.push({...e,opacity:t,cos:Math.cos(e.transform.rotation),sin:Math.sin(e.transform.rotation),matrix:Su(e.transform)})}for(let e=0;e<a;e+=1)for(let t=0;t<i;t+=1){let n=wu(t,e,i,a,yu),r=(e*i+t)*4;for(let e of s){let t=e.matrix.a*e.matrix.d-e.matrix.b*e.matrix.c;if(!(Math.abs(t)>1e-9))continue;let i=n.x-e.transform.x,a=n.y-e.transform.y,s=(e.matrix.d*i-e.matrix.b*a)/t,c=(-e.matrix.c*i+e.matrix.a*a)/t,l=Math.floor(s/(e.transform.flipX?-1:1)+e.width/2),u=Math.floor(c/(e.transform.flipY?-1:1)+e.height/2);l<0||u<0||l>=e.width||u>=e.height||fu(o,r,e.buffer,(u*e.width+l)*4,e.opacity)}}return o}async function Lp(e,t,n){let r=document.createElement(`canvas`);r.width=t,r.height=n;let i=r.getContext(`2d`);if(i===null)throw Error(`2D canvas is unavailable for PNG encoding.`);let a=new ImageData(new Uint8ClampedArray(e),t,n);i.putImageData(a,0,0);let o=await new Promise(e=>{r.toBlob(t=>e(t),`image/png`)});if(o===null)throw Error(`Failed to encode PNG.`);return o}async function Rp(e){let t=await createImageBitmap(e),n=document.createElement(`canvas`);n.width=t.width,n.height=t.height;let r=n.getContext(`2d`);if(r===null)throw t.close(),Error(`2D canvas is unavailable for PNG decoding.`);r.drawImage(t,0,0),t.close();let i=r.getImageData(0,0,n.width,n.height);return{width:n.width,height:n.height,buffer:i.data}}var zp=class extends Error{constructor(e){super(e),this.name=`GnumarusAsepriteError`}},Bp=42464,Vp=61946,Hp=128,Up=16,Wp=6,Gp=4096,Kp=1e4,qp=4096,Jp=4,Yp=17,Xp=8196,Zp=8197,Qp=8217,$p=0,em=1,tm=2,nm=0,rm=1,im=2,am=3,om=8,sm=16,cm=32,lm=class{bytes;label;view;cursor=0;constructor(e,t){this.bytes=e,this.label=t,this.view=new DataView(e.buffer,e.byteOffset,e.byteLength)}get position(){return this.cursor}get length(){return this.bytes.length}fail(e){throw new zp(`${this.label}: ${e} (byte ${this.cursor} of ${this.bytes.length})`)}setPosition(e,t){(!Number.isInteger(e)||e<0||e>this.bytes.length)&&this.fail(`invalid ${t} offset`),this.cursor=e}need(e,t){(!Number.isInteger(e)||e<0||e>this.bytes.length-this.cursor)&&this.fail(`truncated file while reading ${t}`)}u8(e=`byte`){this.need(1,e);let t=this.view.getUint8(this.cursor);return this.cursor+=1,t}u16(e=`word`){this.need(2,e);let t=this.view.getUint16(this.cursor,!0);return this.cursor+=2,t}i16(e=`short`){this.need(2,e);let t=this.view.getInt16(this.cursor,!0);return this.cursor+=2,t}u32(e=`dword`){this.need(4,e);let t=this.view.getUint32(this.cursor,!0);return this.cursor+=4,t}raw(e,t){this.need(e,t);let n=this.bytes.subarray(this.cursor,this.cursor+e);return this.cursor+=e,n}skip(e,t){this.need(e,t),this.cursor+=e}string(){let e=this.u16(`string length`),t=this.raw(e,`string characters`);return um.decode(t)}},um=new TextDecoder(`utf-8`);async function dm(e,t){try{let t=await new Response(new Blob([e.slice()]).stream().pipeThrough(new DecompressionStream(`deflate`))).arrayBuffer();return new Uint8Array(t)}catch(e){throw new zp(`Aseprite file: corrupt zlib data in ${t} (${e instanceof Error?e.message:String(e)})`)}}function fm(e,t){return`${e}\n${t}`}function pm(){return{r:!1,g:!1,b:!1,a:!1}}async function mm(e){let t=new lm(e,`Aseprite file`);e.length<Hp&&t.fail(`file is smaller than the 128-byte header`);let n=t.u32(`file size`);n!==e.length&&t.fail(`declared size ${n} does not match actual size ${e.length}`);let r=t.u16(`magic number`);r!==Bp&&t.fail(`bad magic 0x${r.toString(16)} (not an Aseprite file)`);let i=t.u16(`frame count`);(i<1||i>Kp)&&t.fail(`unsupported frame count ${i}`);let a=t.u16(`canvas width`),o=t.u16(`canvas height`);(a<1||a>Gp||o<1||o>Gp)&&t.fail(`unsupported canvas size ${a}x${o}`);let s=t.u16(`color depth`);s!==om&&s!==sm&&s!==cm&&t.fail(`unsupported color depth ${s}`);let c=t.u32(`header flags`),l=t.u16(`header speed`);t.skip(8,`header reserved`);let u=t.u8(`transparent index`);t.skip(3,`header reserved`),t.u16(`color count`),t.u8(`pixel width`),t.u8(`pixel height`),t.skip(8,`grid geometry`),t.skip(84,`header future`),t.position!==Hp&&t.fail(`header layout mismatch`);let d=s===cm?4:s===sm?2:1,f=[],p=new Map,m=new Map,h=Array(i).fill(l>0?yd(l):100),g=new Map,_=!1;for(let n=0;n<i;n+=1){let r=t.position,i=t.u32(`frame size`);(i<Up||r+i>e.length)&&t.fail(`frame ${n} declares ${i} bytes, which overruns the file`);let a=r+i,o=t.u16(`frame magic`);o!==Vp&&t.fail(`frame ${n} has bad magic 0x${o.toString(16)}`);let s=t.u16(`old chunk count`),l=t.u16(`frame duration`);l>0&&(h[n]=yd(l)),t.skip(2,`frame reserved`);let u=t.u32(`chunk count`),v=u===0?s:u;s===65535&&(u===0&&t.fail(`frame ${n} overflows the old chunk count without a new count`),v=u);for(let e=0;e<v;e+=1){t.position+Wp>a&&t.fail(`frame ${n} ends inside chunk ${e} header`);let r=t.u32(`chunk size`),i=t.u16(`chunk type`);r<Wp&&t.fail(`frame ${n} chunk ${e} declares ${r} bytes`);let o=t.position+r-Wp;switch(o>a&&t.fail(`frame ${n} chunk ${e} overruns the frame`),i){case Jp:case Yp:if(_){t.setPosition(o,`old palette chunk`);break}hm(t,o,i===Yp,g);break;case Xp:_m(t,o,c,f);break;case Zp:{let e=await vm(t,o,n,d,f,p);e!==null&&m.set(fm(e.layer,e.frame),e);break}case Qp:gm(t,o,g),_=!0;break;default:t.setPosition(o,`skipped chunk`)}t.position!==o&&t.fail(`frame ${n} chunk ${e} length mismatch`)}t.position!==a&&t.fail(`frame ${n} declares ${i} bytes but holds a different payload`)}return t.position!==e.length&&t.fail(`trailing data after the last frame`),xm({width:a,height:o,depth:s,transparentIndex:u,frames:i,durations:h,layerSlots:f,rawCels:p,linkedCels:m,palette:g})}function hm(e,t,n,r){let i=e.u16(`palette packet count`),a=0,o=e=>n?Math.round(e*255/63):e;for(let t=0;t<i;t+=1){a+=e.u8(`palette skip`);let t=e.u8(`palette count`),n=t===0?256:t;for(let t=0;t<n;t+=1)a>qp&&e.fail(`palette index out of range`),r.set(a,{r:o(e.u8(`palette red`)),g:o(e.u8(`palette green`)),b:o(e.u8(`palette blue`)),a:255}),a+=1}e.position!==t&&e.fail(`old palette chunk length mismatch`)}function gm(e,t,n){let r=e.u32(`palette size`),i=e.u32(`palette first index`),a=e.u32(`palette last index`);(r<1||r>qp||i>a||a>=r)&&e.fail(`invalid palette range ${i}..${a} of ${r}`),e.skip(8,`palette reserved`);for(let t=i;t<=a;t+=1){let r=e.u16(`palette entry flags`),i=e.u8(`palette red`),a=e.u8(`palette green`),o=e.u8(`palette blue`),s=e.u8(`palette alpha`);if(r&1){let t=e.u16(`palette entry name length`);e.skip(t,`palette entry name`)}n.set(t,{r:i,g:a,b:o,a:s})}e.position!==t&&e.fail(`palette chunk length mismatch`)}function _m(e,t,n,r){let i=e.u16(`layer flags`),a=e.u16(`layer type`);e.u16(`layer child level`),e.skip(4,`layer default size`),e.u16(`layer blend mode`);let o=e.u8(`layer opacity`);e.skip(3,`layer reserved`);let s=e.string();a===tm?e.u32(`tileset index`):a!==$p&&a!==em&&e.fail(`unknown layer type ${a}`),n&4&&e.skip(16,`layer uuid`),e.position!==t&&e.fail(`layer chunk length mismatch`),a===$p?r.push({name:s.length>0?s:null,visible:!!(i&1),opacity:n&1?o/255:1,background:!!(i&8)}):r.push(null)}async function vm(e,t,n,r,i,a){let o=e.u16(`cel layer index`);o>=i.length&&e.fail(`cel references unknown layer ${o}`);let s=e.i16(`cel x`),c=e.i16(`cel y`),l=e.u8(`cel opacity`),u=e.u16(`cel type`);if(e.i16(`cel z-index`),e.skip(5,`cel reserved`),i[o]==null)return e.setPosition(t,`cel on skipped layer`),null;if(u===nm||u===im){let i=e.u16(`cel width`),d=e.u16(`cel height`);(i<1||i>Gp||d<1||d>Gp)&&e.fail(`cel has unsupported size ${i}x${d}`);let f=i*d*r,p;if(u===nm)p=e.raw(f,`raw cel pixels`).slice();else{let r=await dm(e.raw(t-e.position,`compressed cel pixels`),`frame ${n} cel`);r.length!==f&&e.fail(`frame ${n} cel inflates to ${r.length} bytes, expected ${f}`),p=r}return e.position!==t&&e.fail(`frame ${n} cel length mismatch`),a.set(fm(o,n),{layer:o,frame:n,x:s,y:c,opacity:l,width:i,height:d,pixels:p}),null}if(u===rm){let r=e.u16(`linked frame`);return e.position!==t&&e.fail(`frame ${n} linked cel length mismatch`),{layer:o,frame:n,x:s,y:c,opacity:l,linkTo:r}}if(u===am)return e.setPosition(t,`tilemap cel`),null;e.fail(`frame ${n} has unsupported cel type ${u}`)}function ym(e,t,n,r,i,a){let o=e.width*e.height,s=new Uint8ClampedArray(o*4);if(t===cm)return s.set(e.pixels.subarray(0,o*4)),s;if(t===sm){for(let t=0;t<o;t+=1){let n=e.pixels[t*2]??0,r=e.pixels[t*2+1]??0;s[t*4]=n,s[t*4+1]=n,s[t*4+2]=n,s[t*4+3]=r}return s}for(let t=0;t<o;t+=1){let o=e.pixels[t]??0,c=n.get(o);if(c===void 0)throw new zp(`Aseprite file: ${a} uses palette index ${o} which the file never defines`);s[t*4]=c.r,s[t*4+1]=c.g,s[t*4+2]=c.b,s[t*4+3]=!i&&o===r?0:c.a}return s}function bm(e,t){if(t!==255)for(let n=3;n<e.length;n+=4){let r=e[n];r!==void 0&&(e[n]=Math.round(r*t/255))}}function xm(e){let t=[],n=[];e.layerSlots.forEach(e=>{if(e===null){t.push(null);return}let r=`layer${n.length}`;t.push(r),n.push({id:r,name:e.name??`Layer ${n.length+1}`,visible:e.visible,opacity:e.opacity,lockedChannels:pm()})});let r=(t,n)=>{let r=new Set,i=n;for(;;){let a=fm(t,i);if(r.has(a))throw new zp(`Aseprite file: linked cels form a cycle at layer ${t} frame ${n}`);r.add(a);let o=e.rawCels.get(a);if(o!==void 0)return o;let s=e.linkedCels.get(a);if(s===void 0)return null;if(s.linkTo>=e.frames)throw new zp(`Aseprite file: layer ${t} frame ${n} links to out-of-range frame ${s.linkTo}`);i=s.linkTo}},i=[],a=[],o=[],s=new Map,c=(r,o,s,c,l,u)=>{let d=e.layerSlots[r],f=t[r];if(d==null||f==null)throw new zp(`Aseprite file: cannot materialize cel on skipped layer ${r}`);let p=n.find(e=>e.id===f)?.name??f,m=ym(s,e.depth,e.palette,e.transparentIndex,d.background,`layer ${r} frame ${o}`);bm(m,u);let h=`tex${i.length}`;i.push({id:h,name:`${p} frame ${o+1}`,width:s.width,height:s.height,buffer:m});let g=`content${a.length}`;return a.push({id:g,name:`Content ${a.length+1}`,textureId:h,transform:{...yu,x:c+s.width/2-e.width/2,y:l+s.height/2-e.height/2}}),{textureId:h,contentId:g}};e.layerSlots.forEach((n,i)=>{let a=t[i];if(n!==null&&a!==null)for(let n=0;n<e.frames;n+=1){let l=fm(i,n),u=e.rawCels.get(l);if(u!==void 0){let e=c(i,n,u,u.x,u.y,u.opacity);s.set(l,e),o.push({layer:a,frame:n,content:e.contentId});continue}let d=e.linkedCels.get(l);if(d===void 0)continue;if(d.linkTo>=e.frames)throw new zp(`Aseprite file: layer ${t[i]??i} frame ${n} links to out-of-range frame ${d.linkTo}`);let f=r(i,d.linkTo);if(f===null)continue;let p=fm(f.layer,f.frame),m=s.get(p);if(m!==void 0&&d.x===f.x&&d.y===f.y&&d.opacity===f.opacity){o.push({layer:a,frame:n,content:m.contentId});continue}let h=c(i,n,f,d.x,d.y,d.opacity);o.push({layer:a,frame:n,content:h.contentId})}});let l=e.durations[0]??100,u=[];return e.durations.forEach((e,t)=>{let n=yd(e);n!==l&&u.push({frame:t,duration:n})}),{width:e.width,height:e.height,layers:n,textures:i,contents:a,cells:o,frames:e.frames,defaultFrameDuration:l,frameDurations:u}}var Sm=class extends Ce{static styles=o`
    :host {
      display: inline-block;
      font-size: 13px;
      color: #e6e6e6;
    }
    .swatch {
      width: 36px;
      height: 28px;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 0;
      cursor: pointer;
      background:
        linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%),
        linear-gradient(45deg, #808080 25%, transparent 25%, transparent 75%, #808080 75%),
        #ffffff;
      background-size: 8px 8px;
      background-position:
        0 0,
        4px 4px;
      position: relative;
    }
    .swatch-inner {
      position: absolute;
      inset: 0;
      border-radius: 3px;
    }
    .popup {
      position: fixed;
      z-index: 100;
      min-width: 300px;
      max-width: min(360px, 92vw);
      max-height: 80vh;
      overflow-y: auto;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 6px;
      padding: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .model-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-bottom: 8px;
    }
    .model-row select {
      flex: 1 1 auto;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    .axis-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
    }
    .axis-label {
      flex: 0 0 86px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .axis-bar {
      flex: 1 1 auto;
      height: 18px;
      border: 1px solid #555;
      border-radius: 4px;
      position: relative;
      cursor: ew-resize;
      touch-action: none;
      min-width: 80px;
    }
    .axis-bar:focus-visible {
      outline: 2px solid #0e639c;
      outline-offset: 1px;
    }
    .axis-thumb {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 6px;
      margin-left: -3px;
      background: #ffffff;
      border: 1px solid #000000;
      border-radius: 2px;
      pointer-events: none;
    }
    .axis-input {
      flex: 0 0 64px;
      width: 64px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    .axis-unit {
      flex: 0 0 20px;
      color: #9a9a9a;
      font-size: 11px;
    }
    .hex-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin-top: 10px;
    }
    .hex-row input {
      flex: 1 1 auto;
      min-width: 0;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      font-family: monospace;
    }
    .hsv-wheel {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 2px auto 10px;
      touch-action: none;
      user-select: none;
    }
    .hsv-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      cursor: pointer;
    }
    .hsv-ring:focus-visible {
      outline: 2px solid #0e639c;
      outline-offset: 2px;
    }
    .hsv-hole {
      position: absolute;
      left: 32px;
      top: 32px;
      width: 136px;
      height: 136px;
      border-radius: 50%;
      background: #2b2b2b;
      pointer-events: none;
    }
    .hsv-triangle {
      position: absolute;
      left: 50px;
      top: 58px;
      width: 100px;
      height: 84px;
      cursor: crosshair;
    }
    .hsv-triangle:focus-visible {
      outline: 2px solid #0e639c;
      outline-offset: 2px;
    }
    .hsv-thumb {
      position: absolute;
      width: 12px;
      height: 12px;
      margin-left: -6px;
      margin-top: -6px;
      border-radius: 50%;
      background: transparent;
      border: 2px solid #ffffff;
      box-shadow: 0 0 0 1px #000000;
      pointer-events: none;
    }
  `;static properties={value:{type:String},model:{type:String},open:{type:Boolean}};rgba={r:0,g:0,b:0,a:255};modelValues=[0,0,0];hsvHue=0;popupPos=null;constructor(){super(),this.value=`#000000`,this.model=`hsl`,this.open=!1,this.syncFromValue(this.value,`hsl`)}get def(){return Ud(this.model)}syncFromValue(e,t){let n=Qd(e);n!==null&&(this.rgba=n,this.modelValues=Pf(n,t),this.trackHsvHue())}willUpdate(e){if(e.has(`model`)&&(Wd(this.model)||(this.model=`hsl`)),e.has(`value`)||e.has(`model`)){let t=Qd(this.value);t!==null&&(t.r!==this.rgba.r||t.g!==this.rgba.g||t.b!==this.rgba.b||t.a!==this.rgba.a?this.syncFromValue(this.value,this.model):e.has(`model`)&&(this.modelValues=Pf(this.rgba,this.model)))}}emitChange(){this.value=Xd(this.rgba),this.dispatchEvent(new CustomEvent(`gnumarus-color-change`,{detail:{value:this.value},bubbles:!0,composed:!0}))}applyModelValues(e){let t=If(this.model,e);this.rgba={r:t.r,g:t.g,b:t.b,a:Lf(this.model,e,this.rgba.a)},this.modelValues=[...e],this.trackHsvHue(),this.emitChange(),this.requestUpdate()}trackHsvHue(){let e=sf(this.rgba);e.s>.001&&e.v>.001&&(this.hsvHue=(e.h%360+360)%360)}applyHsv(e,t,n){let r=(e%360+360)%360,i=Math.min(1,Math.max(0,t)),a=Math.min(1,Math.max(0,n));this.hsvHue=r;let o=of(r,i,a);this.rgba={r:o.r,g:o.g,b:o.b,a:this.rgba.a},this.modelValues=Pf(this.rgba,this.model),this.emitChange(),this.requestUpdate()}currentHsv(){let e=sf(this.rgba);return{h:this.hsvHue,s:e.s,v:e.v}}onHsvRingPointerDown(e){let t=e.currentTarget;if(t===null)return;e.preventDefault(),t.setPointerCapture(e.pointerId);let n=(e,n)=>{let r=t.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=lf(e-(r.left+r.width/2),n-(r.top+r.height/2)),a=sf(this.rgba);this.applyHsv(i,a.s,a.v)};n(e.clientX,e.clientY);let r=e=>{n(e.clientX,e.clientY)},i=()=>{t.removeEventListener(`pointermove`,r),t.removeEventListener(`pointerup`,i),t.removeEventListener(`pointercancel`,i)};t.addEventListener(`pointermove`,r),t.addEventListener(`pointerup`,i),t.addEventListener(`pointercancel`,i)}onHsvTrianglePointerDown(e){let t=e.currentTarget;if(t===null)return;e.preventDefault(),t.setPointerCapture?.(e.pointerId);let n=(e,n)=>{let r=t.getBoundingClientRect(),{s:i,v:a}=cf(e,n,r.left,r.top,r.width,r.height);this.applyHsv(this.hsvHue,i,a)};n(e.clientX,e.clientY);let r=e=>{n(e.clientX,e.clientY)},i=()=>{window.removeEventListener(`pointermove`,r),window.removeEventListener(`pointerup`,i),window.removeEventListener(`pointercancel`,i)};window.addEventListener(`pointermove`,r),window.addEventListener(`pointerup`,i),window.addEventListener(`pointercancel`,i)}onHsvRingKeyDown(e){let t=0;if(e.key===`ArrowLeft`||e.key===`ArrowDown`)t=e.shiftKey?-10:-1;else if(e.key===`ArrowRight`||e.key===`ArrowUp`)t=e.shiftKey?10:1;else if(e.key===`Home`){let t=sf(this.rgba);this.applyHsv(0,t.s,t.v),e.preventDefault();return}else if(e.key===`End`){let t=sf(this.rgba);this.applyHsv(359.9,t.s,t.v),e.preventDefault();return}else return;e.preventDefault();let n=sf(this.rgba);this.applyHsv(this.hsvHue+t,n.s,n.v)}onHsvTriangleKeyDown(e){let t=e.shiftKey?.1:.01,n=this.currentHsv(),r=n.s,i=n.v;if(e.key===`ArrowLeft`)r-=t;else if(e.key===`ArrowRight`)r+=t;else if(e.key===`ArrowUp`)i+=t;else if(e.key===`ArrowDown`)i-=t;else return;e.preventDefault(),this.applyHsv(n.h,r,i)}onModelSelect(e){let t=e.target?.value??`hsv`;Wd(t)&&t!==this.model&&(this.model=t,this.modelValues=Pf(this.rgba,t))}onAxisInput(e,t){let n=this.def.axes[e];if(n===void 0)return;let r=t.target;if(r===null)return;let i=Jd(r.value,n);if(i===null)return;let a=[...this.modelValues];a[e]=i,this.applyModelValues(a)}onAxisChange(e,t){let n=this.def.axes[e];if(n===void 0)return;let r=t.target;if(r===null)return;let i=Jd(r.value,n);if(i===null){r.value=(this.modelValues[e]??n.min).toFixed(n.decimals);return}let a=[...this.modelValues];a[e]=i,this.applyModelValues(a)}valueFromPointer(e,t,n){let r=n.getBoundingClientRect();if(r.width<=0)return null;let i=Math.min(1,Math.max(0,(t-r.left)/r.width)),a=this.def.axes[e];if(a===void 0)return null;let o=a.min+i*(a.max-a.min);return a.unit===`degrees`?o>=360?359.9:o:a.unit===`byte`?Math.round(o):Math.round(o*10)/10}onBarPointerDown(e,t){let n=t.currentTarget;if(n===null)return;t.preventDefault(),n.setPointerCapture(t.pointerId);let r=t=>{let r=this.valueFromPointer(e,t,n);if(r===null)return;let i=[...this.modelValues];i[e]=r,this.applyModelValues(i)};r(t.clientX);let i=e=>{r(e.clientX)},a=()=>{n.removeEventListener(`pointermove`,i),n.removeEventListener(`pointerup`,a),n.removeEventListener(`pointercancel`,a)};n.addEventListener(`pointermove`,i),n.addEventListener(`pointerup`,a),n.addEventListener(`pointercancel`,a)}onBarKeyDown(e,t){let n=this.def.axes[e];if(n===void 0)return;let r=n.unit===`byte`||n.unit===`degrees`?1:n.decimals>0?.1:1,i=t.shiftKey?r*10:r,a=0;if(t.key===`ArrowLeft`||t.key===`ArrowDown`)a=-i;else if(t.key===`ArrowRight`||t.key===`ArrowUp`)a=i;else if(t.key===`Home`){let r=[...this.modelValues];r[e]=n.min,this.applyModelValues(r),t.preventDefault();return}else if(t.key===`End`){let r=[...this.modelValues];r[e]=n.unit===`degrees`?359.9:n.max,this.applyModelValues(r),t.preventDefault();return}else return;t.preventDefault();let o=(this.modelValues[e]??n.min)+a;n.unit===`degrees`?(o=(o%360+360)%360,o>=360&&(o=359.9)):o=n.unit===`byte`?Math.round(Math.min(n.max,Math.max(n.min,o))):Math.round(Math.min(n.max,Math.max(n.min,o))*10)/10;let s=[...this.modelValues];s[e]=o,this.applyModelValues(s)}onHexInput(e){let t=e.target;if(t===null)return;let n=Qd(t.value);n!==null&&(this.rgba=n,this.modelValues=Pf(n,this.model),this.trackHsvHue(),this.emitChange())}onHexChange(e){let t=e.target;t!==null&&Qd(t.value)===null&&(t.value=Xd(this.rgba))}toggleOpen(){if(this.open=!this.open,this.open){let e=this.shadowRoot?.querySelector(`.swatch`);if(e!==null){let t=e.getBoundingClientRect();this.popupPos={left:Math.min(t.right+8,Math.max(8,window.innerWidth-380)),top:Math.min(t.top,Math.max(8,window.innerHeight-420))}}window.addEventListener(`pointerdown`,this.onDocumentPointerDown),window.addEventListener(`keydown`,this.onDocumentKeyDown)}else this.closePopup()}closePopup(){this.open=!1,this.popupPos=null,window.removeEventListener(`pointerdown`,this.onDocumentPointerDown),window.removeEventListener(`keydown`,this.onDocumentKeyDown)}onDocumentPointerDown=e=>{e.composedPath().includes(this)||this.closePopup()};onDocumentKeyDown=e=>{e.key===`Escape`&&this.closePopup()};disconnectedCallback(){window.removeEventListener(`pointerdown`,this.onDocumentPointerDown),window.removeEventListener(`keydown`,this.onDocumentKeyDown),super.disconnectedCallback()}render(){let e=this.def,t=Xd(this.rgba),n=`background-color: ${t};`,r=this.currentHsv(),i=Xd(of(r.h,1,1)),a=r.h*Math.PI/180,o=100+81.5*Math.sin(a),s=100-81.5*Math.cos(a),c=50+r.s*100,l=58+(1-r.v)*84;return L`
      <button
        class="swatch"
        aria-label="Pick color"
        aria-haspopup="dialog"
        aria-expanded=${this.open?`true`:`false`}
        title="Pick color (current ${t})"
        @click=${()=>this.toggleOpen()}
      >
        <span class="swatch-inner" style=${n}></span>
      </button>
      ${this.open?L`
            <div
              class="popup"
              role="dialog"
              aria-label="Color picker"
              style=${this.popupPos===null?``:`left: ${this.popupPos.left}px; top: ${this.popupPos.top}px;`}
            >
              <div class="hsv-wheel" data-testid="hsv-wheel">
                <div
                  class="hsv-ring"
                  data-testid="hsv-ring"
                  role="slider"
                  tabindex="0"
                  aria-label="Hue wheel"
                  aria-valuemin="0"
                  aria-valuemax="360"
                  aria-valuenow=${Math.round(r.h*10)/10}
                  @pointerdown=${e=>this.onHsvRingPointerDown(e)}
                  @keydown=${e=>this.onHsvRingKeyDown(e)}
                ></div>
                <div class="hsv-hole"></div>
                <svg
                  class="hsv-triangle"
                  data-testid="hsv-triangle"
                  viewBox="0 0 100 84"
                  role="slider"
                  tabindex="0"
                  aria-label="Saturation and value triangle"
                  aria-valuetext=${`${Math.round(r.s*1e3)/10} percent saturation, ${Math.round(r.v*1e3)/10} percent value`}
                  @pointerdown=${e=>this.onHsvTrianglePointerDown(e)}
                  @keydown=${e=>this.onHsvTriangleKeyDown(e)}
                >
                  <defs>
                    <linearGradient id="hsvWhite" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stop-color="#ffffff" />
                      <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
                    </linearGradient>
                    <linearGradient id="hsvBlack" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stop-color="#000000" stop-opacity="0" />
                      <stop offset="1" stop-color="#000000" />
                    </linearGradient>
                  </defs>
                  <polygon points="0,0 100,0 50,84" fill=${i} />
                  <polygon points="0,0 100,0 50,84" fill="url(#hsvWhite)" />
                  <polygon points="0,0 100,0 50,84" fill="url(#hsvBlack)" />
                </svg>
                <div
                  class="hsv-thumb"
                  data-testid="hsv-ring-thumb"
                  style="left: ${o}px; top: ${s}px;"
                ></div>
                <div
                  class="hsv-thumb"
                  data-testid="hsv-tri-thumb"
                  style="left: ${c}px; top: ${l}px;"
                ></div>
              </div>
              <div class="model-row">
                <label for="modelSelect">Model</label>
                <select
                  id="modelSelect"
                  .value=${this.model}
                  @change=${e=>this.onModelSelect(e)}
                >
                  ${Hd.map(e=>L`<option value=${e.id} ?selected=${e.id===this.model}>${e.label}</option>`)}
                </select>
              </div>
              ${e.axes.map((e,t)=>{let n=this.modelValues[t]??e.min,r=e.max>e.min?(n-e.min)/(e.max-e.min)*100:0,i=Rf(this.model,t,this.modelValues),a=e.unit===`percent`?`%`:e.unit===`degrees`?`°`:``;return L`
                  <div class="axis-row">
                    <span class="axis-label">${e.label}</span>
                    <div
                      class="axis-bar"
                      role="slider"
                      tabindex="0"
                      data-testid=${`axis-bar-${e.key}`}
                      aria-label=${`${e.label} (${e.min}-${e.max}${e.unit===`percent`?` percent`:e.unit===`degrees`?` degrees`:``})`}
                      aria-valuemin=${e.min}
                      aria-valuemax=${e.max}
                      aria-valuenow=${Math.round(n*10)/10}
                      style="background: ${i};"
                      @pointerdown=${e=>this.onBarPointerDown(t,e)}
                      @keydown=${e=>this.onBarKeyDown(t,e)}
                    >
                      <div class="axis-thumb" style="left: ${r}%;"></div>
                    </div>
                    <input
                      class="axis-input"
                      data-axis=${e.key}
                      aria-label=${e.label}
                      type="number"
                      min=${e.min}
                      max=${e.max}
                      step=${e.unit===`byte`?1:.1}
                      .value=${n.toFixed(e.decimals)}
                      @input=${e=>this.onAxisInput(t,e)}
                      @change=${e=>this.onAxisChange(t,e)}
                    />
                    <span class="axis-unit">${a}</span>
                  </div>
                `})}
              <div class="hex-row">
                <label for="hexInput">Hex</label>
                <input
                  id="hexInput"
                  data-testid="hex-input"
                  .value=${t}
                  spellcheck="false"
                  @input=${e=>this.onHexInput(e)}
                  @change=${e=>this.onHexChange(e)}
                />
              </div>
            </div>
          `:L``}
    `}};customElements.define(`gnumarus-color-picker`,Sm);var Cm=[{title:`File`,entries:[{keys:`Ctrl+S (Cmd+S on macOS)`,action:`Save (reuses the chosen folder, otherwise shows the folder picker)`},{keys:`Ctrl+E (Cmd+E on macOS)`,action:`Merge active layer down (same as Merge Down)`}]},{title:`History`,entries:[{keys:`Ctrl+Z`,action:`Undo`},{keys:`Ctrl+Y or Shift+Ctrl+Z`,action:`Redo`}]},{title:`Layers`,entries:[{keys:`PageUp`,action:`Select layer above (wraps around)`},{keys:`PageDown`,action:`Select layer below (wraps around)`},{keys:`ArrowUp`,action:`Select layer above (wraps around)`},{keys:`ArrowDown`,action:`Select layer below (wraps around)`},{keys:`Shift+ArrowUp`,action:`Move active layer up (wraps around)`},{keys:`Shift+ArrowDown`,action:`Move active layer down (wraps around)`},{keys:`Insert`,action:`Insert layer above the active layer`},{keys:`Delete`,action:`Reset current cell texture to transparent`}]},{title:`Frames`,entries:[{keys:`ArrowLeft`,action:`Select previous frame (wraps around)`},{keys:`ArrowRight`,action:`Select next frame (wraps around)`},{keys:`Shift+ArrowLeft`,action:`Move current frame left (wraps around)`},{keys:`Shift+ArrowRight`,action:`Move current frame right (wraps around)`}]},{title:`Tools`,entries:[{keys:`B`,action:`Pencil tool`},{keys:`G or F`,action:`Bucket fill tool`},{keys:`N`,action:`Line tool`},{keys:`C`,action:`Curve tool`},{keys:`Z`,action:`Loupe tool`},{keys:`T`,action:`Non-destructive cell transform tool`},{keys:`Y`,action:`3D rotation tool`},{keys:`R`,action:`Rectangular selection tool`},{keys:`V`,action:`Destructive selection transform tool`},{keys:`U`,action:`Destructive 3D rotation tool`},{keys:`E`,action:`Toggle eraser blend mode`},{keys:`Hold Ctrl`,action:`Temporary eyedropper (release to restore the previous tool)`},{keys:`Enter, Return or Esc`,action:`Merge floating selection into the cell`},{keys:`Escape`,action:`Cancel line/curve in progress; close menus and rename fields`}]},{title:`View`,entries:[{keys:`1 (main keyboard)`,action:`Zoom to 100%`},{keys:`2 (main keyboard)`,action:`Fit rotated canvas on screen`},{keys:`4 (main and numpad)`,action:`Rotate canvas counterclockwise by step`},{keys:`6 (main and numpad)`,action:`Rotate canvas clockwise by step`},{keys:`5 (main and numpad)`,action:`Reset canvas rotation`},{keys:`Ctrl+Alt+=`,action:`Zoom in (numpad + also works)`},{keys:`Ctrl+Alt+-`,action:`Zoom out (numpad - also works)`},{keys:`Hold Space and drag`,action:`Pan canvas`},{keys:`Shift+Left-drag (pencil, line, curve)`,action:`Resize tool live from horizontal movement`}]},{title:`Interface`,entries:[{keys:`Tab`,action:`Hide/show all interface chrome except the canvas`}]}],wm=class extends Ce{static styles=o`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #1e1e1e;
      color: #e6e6e6;
      font-size: 13px;
      user-select: none;
    }
    [hidden] {
      display: none !important;
    }
    .menubar {
      display: flex;
      align-items: center;
      height: 32px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      padding: 0 8px;
      gap: 4px;
      flex: 0 0 auto;
    }
    .menu {
      position: relative;
    }
    .menu > button,
    .toolbar button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar .tool-icon {
      display: inline-block;
      transform: scale(2.5);
    }
    .toolbar .tool-icon svg {
      display: block;
    }
    .menu > button:hover,
    .toolbar button:hover {
      background: #3a3a3a;
    }
    .menu > button.active,
    .toolbar button.active {
      background: #0e639c;
      border-color: #0e639c;
    }
    .dropdown {
      position: absolute;
      top: 28px;
      left: 0;
      min-width: 160px;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 4px;
      z-index: 20;
    }
    .dropdown button {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      color: #e6e6e6;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .dropdown button:hover {
      background: #0e639c;
    }
    .dropdown button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .dropdown button:disabled:hover {
      background: transparent;
    }
    .app-title {
      margin-left: 8px;
      color: #9a9a9a;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tool-options {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 30px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      padding: 2px 10px;
      flex: 0 0 auto;
      font-size: 12px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .tool-options label {
      display: flex;
      gap: 6px;
      align-items: center;
    }
    .tool-options input[type="number"] {
      width: 64px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .tool-options select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .tool-options .tool-options-empty {
      color: #9a9a9a;
    }
    .body {
      display: flex;
      flex: 1 1 auto;
      min-height: 0;
    }
    .toolbar {
      width: 56px;
      background: #252526;
      border-right: 1px solid #111;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 0;
      gap: 8px;
      flex: 0 0 auto;
    }
    .toolbar gnumarus-color-picker {
      --gnumarus-swatch-width: 36px;
      --gnumarus-swatch-height: 28px;
    }
    .canvas-host {
      flex: 1 1 auto;
      position: relative;
      min-width: 0;
      min-height: 0;
      background: #333333;
    }
    .canvas-host canvas {
      position: static;
      inset: auto;
    }
    .canvas-host > canvas {
      position: absolute;
      inset: 0;
    }
    .layers-panel {
      width: 220px;
      background: #252526;
      border-left: 1px solid #111;
      display: flex;
      flex-direction: column;
      flex: 0 0 auto;
      min-height: 0;
    }
    .layers-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      font-weight: 600;
      border-bottom: 1px solid #111;
    }
    .layers-header button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 2px 10px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.4;
    }
    .layers-list {
      overflow-y: auto;
      flex: 1 1 auto;
    }
    .layer-row {
      border-bottom: 1px solid #111;
      padding: 4px 6px;
      cursor: pointer;
    }
    .layer-row.active {
      background: #094771;
    }
    .layer-top {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .layer-top input[type="checkbox"] {
      cursor: pointer;
    }
    .layer-name {
      flex: 1 1 auto;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .layer-dims {
      color: #9a9a9a;
      font-size: 11px;
      flex: 0 0 auto;
    }
    .layer-row input.layer-rename {
      flex: 1 1 auto;
      min-width: 0;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #0e639c;
      border-radius: 4px;
      padding: 2px 4px;
    }
    .layer-row button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .layer-row button:hover {
      background: #3a3a3a;
    }
    .layer-row button:disabled {
      opacity: 0.3;
      cursor: default;
    }
    .layer-row button:disabled:hover {
      background: transparent;
    }
    .layer-opacity {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-opacity input[type="range"] {
      flex: 1 1 auto;
      min-width: 0;
    }
    .layer-channels {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-channels button {
      flex: 1 1 auto;
      min-width: 0;
      padding: 2px 0;
      font-size: 11px;
      font-weight: 600;
    }
    .layer-channels button.active {
      background: #b56600;
      border-color: #b56600;
    }
    .layer-resize {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
      color: #9a9a9a;
    }
    .layer-resize button {
      flex: 0 0 auto;
    }
    .anim-matrix {
      flex: 0 0 auto;
      max-height: 148px;
      background: #252526;
      border-top: 1px solid #111;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .anim-scroll {
      overflow: auto;
      min-height: 0;
    }
    .anim-grid {
      display: inline-grid;
      min-width: 100%;
    }
    .anim-corner,
    .anim-frame-header,
    .anim-layer-name {
      position: sticky;
      background: #2b2b2b;
      z-index: 2;
    }
    .anim-corner {
      top: 0;
      left: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 2px;
    }
    .anim-corner button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 13px;
      line-height: 1.4;
    }
    .anim-corner button:hover {
      background: #3a3a3a;
    }
    .anim-frame-header {
      top: 0;
      text-align: center;
      padding: 2px;
    }
    .anim-frame-header button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      width: 100%;
    }
    .anim-frame-header.current button {
      background: #0e639c;
      border-color: #0e639c;
    }
    .anim-frame-header button:hover {
      background: #3a3a3a;
    }
    .anim-frame-header.current button:hover {
      background: #0e639c;
    }
    .anim-layer-name {
      left: 0;
      padding: 2px 8px;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border-top: 1px solid #111;
      line-height: 24px;
    }
    .anim-cell {
      border-top: 1px solid #111;
      border-left: 1px solid #111;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 11px;
      color: #9a9a9a;
      padding: 0 4px;
      overflow: hidden;
    }
    .anim-cell.filled {
      background: #094771;
      color: #e6e6e6;
    }
    .anim-cell.current-frame {
      box-shadow: inset 0 0 0 1px #0e639c;
    }
    .anim-cell.active-cell {
      box-shadow: inset 0 0 0 2px #ffd23f;
    }
    .anim-cell .cell-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .context-blocker {
      position: fixed;
      inset: 0;
      z-index: 40;
    }
    .context-menu {
      position: fixed;
      z-index: 41;
      min-width: 160px;
      max-width: min(320px, 90vw);
      max-height: 260px;
      overflow-y: auto;
      background: #2b2b2b;
      border: 1px solid #111;
      border-radius: 4px;
      padding: 4px;
    }
    .context-menu button {
      display: block;
      width: 100%;
      text-align: left;
      background: transparent;
      color: #e6e6e6;
      border: none;
      border-radius: 4px;
      padding: 6px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .context-menu button:hover {
      background: #0e639c;
    }
    .context-menu button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .context-menu button:disabled:hover {
      background: transparent;
    }
    .statusbar {
      display: flex;
      align-items: center;
      gap: 16px;
      height: 26px;
      background: #007acc;
      color: #fff;
      padding: 0 10px;
      font-size: 12px;
      flex: 0 0 auto;
      overflow: hidden;
      white-space: nowrap;
    }
    .statusbar .spacer {
      flex: 1 1 auto;
    }
    dialog {
      background: #2b2b2b;
      color: #e6e6e6;
      border: 1px solid #111;
      border-radius: 6px;
      padding: 16px;
    }
    dialog label {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    dialog input {
      width: 90px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
    }
    dialog select {
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px 6px;
      max-width: 260px;
    }
    .settings-section {
      margin: 12px 0 4px 0;
      font-weight: 600;
      border-bottom: 1px solid #444;
      padding-bottom: 4px;
    }
    .setting-row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 8px 0;
    }
    .setting-row label {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 0;
      flex: 1 1 auto;
    }
    .reset-btn {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      font-size: 14px;
      line-height: 1.2;
    }
    .reset-btn:hover {
      background: #0e639c;
      border-color: #0e639c;
    }
    .preview-window {
      position: absolute;
      z-index: 30;
      min-width: 160px;
      min-height: 160px;
      width: 264px;
      height: 288px;
      max-width: 80%;
      max-height: 80%;
      background: #252526;
      border: 1px solid #0e639c;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      resize: both;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    .preview-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      background: #2b2b2b;
      border-bottom: 1px solid #111;
      cursor: move;
      flex: 0 0 auto;
      font-weight: 600;
    }
    .preview-header .spacer {
      flex: 1 1 auto;
    }
    .preview-header button {
      background: transparent;
      color: #e6e6e6;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
    }
    .preview-header button:hover {
      background: #3a3a3a;
    }
    .preview-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      flex: 0 0 auto;
      font-size: 12px;
    }
    .preview-toolbar button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 2px 10px;
      cursor: pointer;
    }
    .preview-body {
      flex: 1 1 auto;
      overflow: auto;
      min-height: 0;
      background: #1e1e1e;
      display: flex;
      cursor: grab;
      touch-action: none;
    }
    .preview-body:active {
      cursor: grabbing;
    }
    .preview-body canvas {
      image-rendering: pixelated;
      background: transparent;
      flex: 0 0 auto;
      margin: auto;
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 12px;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      color: #fff;
      padding: 6px 14px;
      border-radius: 12px;
      font-size: 13px;
      z-index: 20;
      pointer-events: none;
      white-space: nowrap;
    }
    .dialog-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 12px;
    }
    .dialog-actions button {
      background: #0e639c;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .shortcuts-list {
      max-height: min(60vh, 420px);
      min-width: min(480px, 80vw);
      overflow-y: auto;
      margin: 8px 0;
    }
    .shortcuts-list h4 {
      margin: 12px 0 4px 0;
    }
    .shortcuts-list h4:first-child {
      margin-top: 0;
    }
    .shortcuts-list table {
      border-collapse: collapse;
      width: 100%;
    }
    .shortcuts-list td {
      padding: 3px 8px 3px 0;
      vertical-align: top;
    }
    .shortcuts-list kbd {
      background: #1e1e1e;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 1px 6px;
      white-space: nowrap;
    }
    .picker-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px;
      max-height: 320px;
      overflow-y: auto;
      min-width: 320px;
      max-width: min(560px, 80vw);
      padding: 4px;
      margin: 8px 0;
    }
    .picker-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      background: #1e1e1e;
      color: #e6e6e6;
      border: 1px solid #555;
      border-radius: 6px;
      padding: 8px 6px;
      cursor: pointer;
      font-size: 12px;
      min-height: 96px;
    }
    .picker-item:hover {
      background: #0e639c;
      border-color: #0e639c;
    }
    .picker-item .picker-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .picker-thumb {
      width: 48px;
      height: 48px;
      image-rendering: pixelated;
      background: transparent;
      border: 1px solid #111;
    }
    .picker-empty {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px dashed #555;
      border-radius: 4px;
      font-size: 20px;
      color: #9a9a9a;
    }
    .error {
      color: #ffb3b3;
    }
  `;static properties={tool:{type:String},colorValue:{type:String},zoomText:{type:String},rotText:{type:String},flipText:{type:String},cursorText:{type:String},canvasText:{type:String},layerText:{type:String},frameText:{type:String},projectName:{type:String},dirty:{type:Boolean},statusMessage:{type:String},fileMenuOpen:{type:Boolean},editMenuOpen:{type:Boolean},helpMenuOpen:{type:Boolean},webglError:{type:String},fsSupported:{type:Boolean},newWidth:{type:Number},newHeight:{type:Number},resizeWidth:{type:Number},resizeHeight:{type:Number},resizingLayerId:{type:String},checkerMode:{type:String},checkerSizeX:{type:Number},checkerSizeY:{type:Number},gridMinZoom:{type:Number},rotationStepDeg:{type:Number},floatingActive:{type:Boolean},backgroundMode:{type:String},backgroundColor:{type:String},previewOpen:{type:Boolean},previewZoom:{type:Number},previewX:{type:Number},previewY:{type:Number},canUndo:{type:Boolean},canRedo:{type:Boolean},layers:{type:Array},activeLayerId:{type:String},renamingId:{type:String},contextMenuLayerId:{type:String},contextMenuX:{type:Number},contextMenuY:{type:Number},matrixMenu:{type:Object},contentPickerTarget:{type:Object},texturePickerContentId:{type:String},fitTextureTarget:{type:Object},fitThreshold:{type:Number},checkerColorA:{type:String},checkerColorB:{type:String},defaultFrameDuration:{type:Number},durationTargetFrame:{type:Number},durationValue:{type:Number},playing:{type:Boolean},uiHidden:{type:Boolean},toastMessage:{type:String},toastDurationSec:{type:Number},fitDefaultThreshold:{type:Number},renamingFrame:{type:Number},brushSize:{type:Number},brushShape:{type:String},pencilAntialias:{type:Boolean},pencilPixelPerfect:{type:Boolean},curvePixelPerfect:{type:Boolean},stabilizerMode:{type:String},ropeLength:{type:Number},followStrength:{type:Number},blendMode:{type:String},accumulate:{type:Boolean},lineWidth:{type:Number},lineShape:{type:String},lineAntialias:{type:Boolean},curveWidth:{type:Number},curveShape:{type:String},curveAntialias:{type:Boolean}};engine=null;directoryHandle=null;playTimer=null;toastTimer=null;constructor(){super(),this.tool=`pencil`,this.colorValue=`#000000`,this.zoomText=`800%`,this.rotText=`0°`,this.flipText=``,this.cursorText=`-`,this.canvasText=`64 x 64`,this.projectName=`Untitled`,this.dirty=!1,this.statusMessage=`Ready`,this.fileMenuOpen=!1,this.editMenuOpen=!1,this.helpMenuOpen=!1,this.webglError=``,this.fsSupported=!0,this.newWidth=64,this.newHeight=64,this.resizeWidth=64,this.resizeHeight=64,this.resizingLayerId=null,this.checkerMode=Ju.mode,this.checkerSizeX=Ju.sizeX,this.checkerSizeY=Ju.sizeY,this.gridMinZoom=nd.minZoom,this.rotationStepDeg=ud.stepDeg,this.floatingActive=!1,this.backgroundMode=Md.mode,this.backgroundColor=Md.color,this.previewOpen=!1,this.previewZoom=4,this.previewX=0,this.previewY=0,this.canUndo=!1,this.canRedo=!1,this.layers=[],this.activeLayerId=``,this.layerText=`-`,this.frameText=`Frame 1/1`,this.renamingId=null,this.contextMenuLayerId=null,this.contextMenuX=0,this.contextMenuY=0,this.matrixMenu=null,this.contentPickerTarget=null,this.texturePickerContentId=null,this.fitTextureTarget=null,this.fitThreshold=0,this.checkerColorA=Ju.colorA,this.checkerColorB=Ju.colorB,this.defaultFrameDuration=100,this.durationTargetFrame=null,this.durationValue=null,this.playing=!1,this.playTimer=null,this.uiHidden=!1,this.toastMessage=``,this.toastDurationSec=vp.durationSec,this.fitDefaultThreshold=Ep.alphaThreshold,this.renamingFrame=null,this.brushSize=1,this.brushShape=`square`,this.pencilAntialias=!1,this.pencilPixelPerfect=!1,this.curvePixelPerfect=!1,this.stabilizerMode=Vu,this.ropeLength=20,this.followStrength=20,this.blendMode=`normal`,this.accumulate=!0,this.lineWidth=1,this.lineShape=`square`,this.lineAntialias=!1,this.curveWidth=1,this.curveShape=`square`,this.curveAntialias=!1}render(){return L`
      <div class="menubar" ?hidden=${this.uiHidden}>
        <div class="menu">
          <button
            class=${this.fileMenuOpen?`active`:``}
            @click=${()=>{this.fileMenuOpen=!this.fileMenuOpen,this.editMenuOpen=!1,this.helpMenuOpen=!1}}
          >
            File
          </button>
          ${this.fileMenuOpen?L`
                <div class="dropdown">
                  <button @click=${()=>void this.openNewDialog()}>New</button>
                  <button @click=${()=>void this.openProject()}>Open</button>
                  <button title="Save (Ctrl+S)" @click=${()=>void this.saveProject()}>Save</button>
                  <button @click=${()=>void this.importAseprite()}>Import</button>
                </div>
              `:L``}
        </div>
        <div class="menu">
          <button
            class=${this.editMenuOpen?`active`:``}
            @click=${()=>{this.editMenuOpen=!this.editMenuOpen,this.fileMenuOpen=!1,this.helpMenuOpen=!1}}
          >
            Edit
          </button>
          ${this.editMenuOpen?L`
                <div class="dropdown">
                  <button ?disabled=${!this.canUndo} @click=${()=>this.doUndo()}>Undo</button>
                  <button ?disabled=${!this.canRedo} @click=${()=>this.doRedo()}>Redo</button>
                  <button @click=${()=>this.openSettingsDialog()}>Settings</button>
                  <button @click=${()=>this.resetCanvasTransform()}>Reset Canvas Transform</button>
                </div>
              `:L``}
        </div>
        <div class="menu">
          <button
            class=${this.helpMenuOpen?`active`:``}
            @click=${()=>{this.helpMenuOpen=!this.helpMenuOpen,this.fileMenuOpen=!1,this.editMenuOpen=!1}}
          >
            Help
          </button>
          ${this.helpMenuOpen?L`
                <div class="dropdown">
                  <button @click=${()=>this.openShortcutsDialog()}>Shortcuts</button>
                </div>
              `:L``}
        </div>
        <span class="app-title">Gnumaru's Painting and Animation App${this.dirty?` — *modified*`:``}</span>
      </div>
      ${this.renderToolOptions()}
      <div class="body">
        <div class="toolbar" ?hidden=${this.uiHidden}>
          <button
            class=${this.tool===`pencil`?`active`:``}
            title="B: Pencil (pixel-art solid brush, size and shape in the options bar)"
            aria-label="Pencil"
            @click=${()=>{this.tool=`pencil`,this.engine?.setTool(`pencil`)}}
          >
            <span class="tool-icon">✎</span>
          </button>
          <button
            class=${this.tool===`loupe`?`active`:``}
            title="Z: Loupe (left-drag zoom, right-drag rotate, middle-click flip)"
            aria-label="Loupe"
            @click=${()=>{this.tool=`loupe`,this.engine?.setTool(`loupe`)}}
          >
            <span class="tool-icon">⌕</span>
          </button>
          <button
            class=${this.tool===`bucket`?`active`:``}
            title="G or F: Bucket fill (click fills contiguous same-color region)"
            aria-label="Bucket fill"
            @click=${()=>{this.tool=`bucket`,this.engine?.setTool(`bucket`)}}
          >
            <span class="tool-icon"
              ><svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2.8 6.4h10.4l-1.6 7H4.4L2.8 6.4z" />
                <path d="M2 6.4h12" />
                <path d="M11.6 1.2c.7 1 1.4 1.9 1.4 2.8a1.4 1.4 0 1 1-2.8 0c0-.9.7-1.8 1.4-2.8z" />
              </svg>
            </span>
          </button>
          <button
            class=${this.tool===`eyedropper`?`active`:``}
            title="Ctrl (hold): Eyedropper (click a pixel to copy its color)"
            aria-label="Eyedropper"
            @click=${()=>{this.tool=`eyedropper`,this.engine?.setTool(`eyedropper`)}}
          >
            <span class="tool-icon"
              ><svg
                viewBox="0 0 16 16"
                width="13"
                height="13"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M8 1.8S4.8 6.2 4.8 9.4a3.2 3.2 0 0 0 6.4 0C11.2 6.2 8 1.8 8 1.8z" />
              </svg>
            </span>
          </button>
          <button
            class=${this.tool===`line`?`active`:``}
            title="N: Line (click start point, click end point)"
            aria-label="Line"
            @click=${()=>{this.tool=`line`,this.engine?.setTool(`line`)}}
          >
            <span class="tool-icon">╲</span>
          </button>
          <button
            class=${this.tool===`curve`?`active`:``}
            title="C: Curve (drag endpoints, then two control clicks)"
            aria-label="Curve"
            @click=${()=>{this.tool=`curve`,this.engine?.setTool(`curve`)}}
          >
            <span class="tool-icon">〜</span>
          </button>
          <button
            class=${this.tool===`rectselect`?`active`:``}
            title="R: Rectangular selection (drag to mark, release cuts to floating)"
            aria-label="Rectangular selection"
            @click=${()=>{this.tool=`rectselect`,this.engine?.setTool(`rectselect`)}}
          >
            <span class="tool-icon">▭</span>
          </button>
          <button
            class=${this.tool===`destransform`?`active`:``}
            title="V: Destructive selection transform (drag anchors to move, resize, rotate or skew; Enter merges)"
            aria-label="Destructive selection transform"
            @click=${()=>{this.tool=`destransform`,this.engine?.setTool(`destransform`)}}
          >
            <span class="tool-icon">✛</span>
          </button>
          <button
            class=${this.tool===`transform`?`active`:``}
            title="T: Non-destructive cell transform (drag anchors to move, resize, rotate, skew or flip; center resets)"
            aria-label="Non-destructive cell transform"
            @click=${()=>{this.tool=`transform`,this.engine?.setTool(`transform`)}}
          >
            <span class="tool-icon">⤢</span>
          </button>
          <button
            class=${this.tool===`transform3d`?`active`:``}
            title="Y: 3D rotation (drag to tilt the layer, rings rotate one axis, center resets rotations)"
            aria-label="3D rotation"
            @click=${()=>{this.tool=`transform3d`,this.engine?.setTool(`transform3d`)}}
          >
            <span class="tool-icon">⟳</span>
          </button>
          <button
            class=${this.tool===`destransform3d`?`active`:``}
            title="U: Destructive 3D rotation (drag to tilt the selection, rings rotate one axis, Enter merges)"
            aria-label="Destructive 3D rotation"
            @click=${()=>{this.tool=`destransform3d`,this.engine?.setTool(`destransform3d`)}}
          >
            <span class="tool-icon">⟲</span>
          </button>
          <gnumarus-color-picker
            id="pencilColor"
            .value=${this.colorValue}
            model="hsl"
            @gnumarus-color-change=${e=>{let t=e.detail;typeof t?.value==`string`&&this.setPencilColor(t.value)}}
          ></gnumarus-color-picker>
          <button
            class=${this.previewOpen?`active`:``}
            title="Final preview (flattened image)"
            aria-label="Final preview"
            @click=${()=>{this.togglePreview()}}
          >
            <span class="tool-icon">⊞</span>
          </button>
        </div>
        <div class="canvas-host" id="canvasHost">
          ${this.previewOpen?L`
                <div
                  class="preview-window"
                  style="left: ${this.previewX}px; top: ${this.previewY}px;"
                  data-testid="final-preview"
                >
                  <div
                    class="preview-header"
                    @pointerdown=${e=>this.onPreviewDragStart(e)}
                  >
                    <span>Final preview</span>
                    <span class="spacer"></span>
                    <button aria-label="Close preview" title="Close preview" @click=${()=>this.togglePreview()}>
                      ×
                    </button>
                  </div>
                  <div class="preview-toolbar">
                    <button aria-label="Zoom out preview" title="Zoom out preview" @click=${()=>this.zoomPreview(.5)}>
                      −
                    </button>
                    <span>${Math.round(this.previewZoom*100)}%</span>
                    <button aria-label="Zoom in preview" title="Zoom in preview" @click=${()=>this.zoomPreview(2)}>
                      +
                    </button>
                    <button aria-label="Reset preview zoom" title="Reset preview zoom" @click=${()=>this.resetPreviewZoom()}>
                      1:1
                    </button>
                  </div>
                  <div
                    class="preview-body"
                    @wheel=${e=>{e.preventDefault(),this.zoomPreview(e.deltaY<0?1.25:.8)}}
                    @pointerdown=${e=>this.onPreviewPanStart(e)}
                    @mousedown=${e=>{e.button===1&&e.preventDefault()}}
                    @contextmenu=${e=>{e.preventDefault()}}
                  >
                    <canvas id="previewCanvas"></canvas>
                  </div>
                </div>
              `:L``}
          ${this.toastMessage===``?L``:L`<div class="toast" data-testid="toast">${this.toastMessage}</div>`}
        </div>
        <aside class="layers-panel" aria-label="Layers" ?hidden=${this.uiHidden}>
          <div class="layers-header">
            <span>Layers</span>
            <button aria-label="Add layer" title="Add layer" @click=${()=>this.onAddLayer()}>+</button>
          </div>
          <div class="layers-list">
            ${[...this.layers].reverse().map((e,t,n)=>L`
                <div
                  class="layer-row ${e.id===this.activeLayerId?`active`:``}"
                  data-layer-id=${e.id}
                  @click=${()=>this.onSelectLayer(e.id)}
                  @contextmenu=${t=>{t.preventDefault(),this.openLayerMenu(e.id,t.clientX,t.clientY)}}
                >
                  <div class="layer-top">
                    <input
                      type="checkbox"
                      aria-label="Toggle layer visibility"
                      .checked=${e.visible}
                      @click=${e=>e.stopPropagation()}
                      @change=${t=>{let n=t.target;n!==null&&this.onToggleVisible(e.id,n.checked)}}
                    />
                    ${this.renamingId===e.id?L`
                          <input
                            class="layer-rename"
                            .value=${e.name}
                            @click=${e=>e.stopPropagation()}
                            @keydown=${t=>{t.key===`Enter`?this.onRenameCommit(e.id):t.key===`Escape`&&this.onRenameCancel(),t.stopPropagation()}}
                            @blur=${()=>this.onRenameCommit(e.id)}
                          />
                        `:L`
                          <span class="layer-name" @dblclick=${()=>this.onRenameStart(e.id)}>
                            ${e.name}
                          </span>
                          <span class="layer-dims">${e.width}×${e.height}</span>
                        `}
                    <button
                      aria-label="Move layer up"
                      title="Move up"
                      ?disabled=${t===0}
                      @click=${t=>{t.stopPropagation(),this.onMoveLayer(e.id,`up`)}}
                    >
                      ▲
                    </button>
                    <button
                      aria-label="Move layer down"
                      title="Move down"
                      ?disabled=${t===n.length-1}
                      @click=${t=>{t.stopPropagation(),this.onMoveLayer(e.id,`down`)}}
                    >
                      ▼
                    </button>
                    <button
                      aria-label="Delete layer"
                      title="Delete layer"
                      ?disabled=${this.layers.length<=1}
                      @click=${t=>{t.stopPropagation(),this.onRemoveLayer(e.id)}}
                    >
                      ×
                    </button>
                  </div>
                  <div class="layer-opacity">
                    <span>Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      aria-label="Layer opacity"
                      .value=${String(Math.round(e.opacity*100))}
                      @input=${t=>{let n=t.target;n!==null&&this.onOpacityInput(e.id,Number(n.value)/100)}}
                    />
                  </div>
                  <div class="layer-channels">
                    <span>Lock</span>
                    <button
                      class=${e.lockedChannels.r?`active`:``}
                      title=${e.lockedChannels.r?`Unlock red channel`:`Lock red channel`}
                      aria-label="Lock red channel"
                      aria-pressed=${e.lockedChannels.r?`true`:`false`}
                      @click=${()=>{this.onToggleChannelLock(e.id,`r`)}}
                    >
                      R
                    </button>
                    <button
                      class=${e.lockedChannels.g?`active`:``}
                      title=${e.lockedChannels.g?`Unlock green channel`:`Lock green channel`}
                      aria-label="Lock green channel"
                      aria-pressed=${e.lockedChannels.g?`true`:`false`}
                      @click=${()=>{this.onToggleChannelLock(e.id,`g`)}}
                    >
                      G
                    </button>
                    <button
                      class=${e.lockedChannels.b?`active`:``}
                      title=${e.lockedChannels.b?`Unlock blue channel`:`Lock blue channel`}
                      aria-label="Lock blue channel"
                      aria-pressed=${e.lockedChannels.b?`true`:`false`}
                      @click=${()=>{this.onToggleChannelLock(e.id,`b`)}}
                    >
                      B
                    </button>
                    <button
                      class=${e.lockedChannels.a?`active`:``}
                      title=${e.lockedChannels.a?`Unlock alpha channel`:`Lock alpha channel`}
                      aria-label="Lock alpha channel"
                      aria-pressed=${e.lockedChannels.a?`true`:`false`}
                      @click=${()=>{this.onToggleChannelLock(e.id,`a`)}}
                    >
                      A
                    </button>
                  </div>
                  <div class="layer-resize">
                    <span>Size</span>
                    <button
                      aria-label="Resize layer"
                      title="Resize layer (expand right and down, crop right and below)"
                      @click=${t=>{t.stopPropagation(),this.openResizeDialog(e.id)}}
                    >
                      ${e.width}×${e.height} Resize
                    </button>
                  </div>
                </div>
              `)}
          </div>
        </aside>
        ${this.contextMenuLayerId===null?L``:L`
              <div class="context-blocker" @click=${()=>this.closeLayerMenu()} @contextmenu=${e=>{e.preventDefault(),this.closeLayerMenu()}}></div>
              <div
                class="context-menu"
                style="left: ${this.contextMenuX}px; top: ${this.contextMenuY}px;"
              >
                <button
                  ?disabled=${this.layers.length>0&&this.layers[0]?.id===this.contextMenuLayerId}
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onMergeDown(this.contextMenuLayerId)}}
                >
                  Merge Down
                </button>
                <button
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onAddLayerAbove(this.contextMenuLayerId)}}
                >
                  Add above
                </button>
                <button
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onAddLayerBelow(this.contextMenuLayerId)}}
                >
                  Add below
                </button>
                <button
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onResetLayerTransform(this.contextMenuLayerId)}}
                >
                  Reset transform
                </button>
                <button
                  ?disabled=${this.contextMenuLayerId===null||this.engine?.getCellTextureId(this.contextMenuLayerId,this.engine.getCurrentFrame())===null}
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onOpenFitTextureFromLayer(this.contextMenuLayerId)}}
                >
                  Fit texture to size
                </button>
                <button
                  ?disabled=${this.contextMenuLayerId===null||this.engine?.getCellTextureId(this.contextMenuLayerId,this.engine.getCurrentFrame())===null}
                  @click=${()=>{this.contextMenuLayerId!==null&&this.onCropCellToCanvasFromLayer(this.contextMenuLayerId)}}
                >
                  Crop to canvas
                </button>
              </div>
            `}
      </div>
      ${this.renderAnimationMatrix()}
      ${this.renderMatrixMenu()}
      <div class="statusbar" ?hidden=${this.uiHidden}>
        <span>${this.toolDisplayName(this.tool)}</span>
        <span>${this.colorValue}</span>
        <span>${this.cursorText}</span>
        <span>${this.canvasText}</span>
        <span>${this.layerText}</span>
        <span>${this.frameText}</span>
        <span>${this.zoomText}</span>
        <span>${this.rotText}</span>
        <span>${this.flipText}</span>
        <span>${this.projectName}</span>
        <span class="spacer"></span>
        ${this.webglError===``?L``:L`<span class="error">${this.webglError}</span>`}
        <span>${this.statusMessage}</span>
      </div>
      <dialog id="newDialog">
        <h3>New canvas</h3>
        <label>Width <input type="number" id="newWidth" min="1" max="1024" .value=${String(this.newWidth)} /></label>
        <label>Height <input type="number" id="newHeight" min="1" max="1024" .value=${String(this.newHeight)} /></label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeNewDialog()}>Cancel</button>
          <button @click=${()=>void this.createNew()}>Create</button>
        </div>
      </dialog>
      <dialog id="resizeDialog">
        <h3>Resize layer</h3>
        <p>Expanding adds transparent pixels right and below. Shrinking crops right and below.</p>
        <label>Width <input type="number" id="resizeWidth" min="1" max="1024" .value=${String(this.resizeWidth)} /></label>
        <label>Height <input type="number" id="resizeHeight" min="1" max="1024" .value=${String(this.resizeHeight)} /></label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeResizeDialog()}>Cancel</button>
          <button @click=${()=>this.confirmResize()}>Resize</button>
        </div>
      </dialog>
      <dialog id="fitTextureDialog">
        <h3>Fit texture to size</h3>
        <p>Crops transparent borders on all four sides. Pixels with alpha up to the threshold count as empty.</p>
        <label
          >Alpha threshold
          <input type="number" id="fitThreshold" min="0" max="254" step="1" .value=${String(this.fitThreshold)} />
        </label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeFitTextureDialog()}>Cancel</button>
          <button id="fitTextureOk" @click=${()=>this.confirmFitTexture()}>OK</button>
        </div>
      </dialog>
      <dialog id="shortcutsDialog">
        <h3>Keyboard shortcuts</h3>
        <div class="shortcuts-list">
          ${Cm.map(e=>L`
              <h4>${e.title}</h4>
              <table>
                ${e.entries.map(e=>L`
                    <tr>
                      <td><kbd>${e.keys}</kbd></td>
                      <td>${e.action}</td>
                    </tr>
                  `)}
              </table>
            `)}
        </div>
        <div class="dialog-actions">
          <button @click=${()=>this.closeShortcutsDialog()}>Close</button>
        </div>
      </dialog>
      <dialog id="settingsDialog">
        <h3>Settings</h3>
        <div class="settings-section">Background</div>
        <div class="setting-row">
          <label
            >Background mode
            <select id="backgroundMode" .value=${this.backgroundMode} @change=${()=>this.applyBackgroundFromDialog()}>
              <option value="checkerboard">Checkerboard</option>
              <option value="solid">Solid color</option>
            </select>
          </label>
          ${this.backgroundMode===Md.mode?L``:L`<button
                class="reset-btn"
                aria-label="Reset background mode to default"
                title="Reset to default"
                @click=${()=>this.resetBackgroundModeToDefault()}
              >
                ↻
              </button>`}
        </div>
        ${this.backgroundMode===`solid`?L`
              <div class="setting-row">
                <span>Solid color</span>
                <gnumarus-color-picker
                  id="backgroundColor"
                  .value=${this.backgroundColor}
                  model="hsl"
                  @gnumarus-color-change=${e=>{let t=e.detail;typeof t?.value==`string`&&this.setBackgroundColor(t.value)}}
                ></gnumarus-color-picker>
                ${this.backgroundColor.toLowerCase()===Md.color.toLowerCase()?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset background color to default"
                      title="Reset to default"
                      @click=${()=>this.resetBackgroundColorToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
            `:L``}
        ${this.backgroundMode===`checkerboard`?L`
              <div class="settings-section">Checkerboard</div>
              <div class="setting-row">
                <label
                  >Checkerboard mode
                  <select
                    id="checkerMode"
                    .value=${this.checkerMode}
                    @change=${()=>this.applyCheckerFromDialog()}
                  >
                    <option value="image">Image-space (moves and zooms with the canvas)</option>
                    <option value="screen">Screen-space (fixed on screen)</option>
                  </select>
                </label>
                ${this.checkerMode===Ju.mode?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset checkerboard mode to default"
                      title="Reset to default"
                      @click=${()=>this.resetCheckerModeToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
              <div class="setting-row">
                <label
                  >Checker width
                  <input
                    type="number"
                    id="checkerSizeX"
                    min="1"
                    max="128"
                    .value=${String(this.checkerSizeX)}
                    @input=${()=>this.applyCheckerFromDialog()}
                  />
                </label>
                ${this.checkerSizeX===Ju.sizeX?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset checker width to default"
                      title="Reset to default"
                      @click=${()=>this.resetCheckerSizeXToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
              <div class="setting-row">
                <label
                  >Checker height
                  <input
                    type="number"
                    id="checkerSizeY"
                    min="1"
                    max="128"
                    .value=${String(this.checkerSizeY)}
                    @input=${()=>this.applyCheckerFromDialog()}
                  />
                </label>
                ${this.checkerSizeY===Ju.sizeY?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset checker height to default"
                      title="Reset to default"
                      @click=${()=>this.resetCheckerSizeYToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
              <div class="setting-row">
                <span>Checker color A</span>
                <gnumarus-color-picker
                  id="checkerColorA"
                  .value=${this.checkerColorA}
                  model="hsl"
                  @gnumarus-color-change=${e=>{let t=e.detail;typeof t?.value==`string`&&this.setCheckerColorA(t.value)}}
                ></gnumarus-color-picker>
                ${this.checkerColorA.toLowerCase()===Ju.colorA.toLowerCase()?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset checker color A to default"
                      title="Reset to default"
                      @click=${()=>this.resetCheckerColorAToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
              <div class="setting-row">
                <span>Checker color B</span>
                <gnumarus-color-picker
                  id="checkerColorB"
                  .value=${this.checkerColorB}
                  model="hsl"
                  @gnumarus-color-change=${e=>{let t=e.detail;typeof t?.value==`string`&&this.setCheckerColorB(t.value)}}
                ></gnumarus-color-picker>
                ${this.checkerColorB.toLowerCase()===Ju.colorB.toLowerCase()?L``:L`<button
                      class="reset-btn"
                      aria-label="Reset checker color B to default"
                      title="Reset to default"
                      @click=${()=>this.resetCheckerColorBToDefault()}
                    >
                      ↻
                    </button>`}
              </div>
            `:L``}
        <div class="settings-section">Pixel grid</div>
        <div class="setting-row">
          <label
            >Pixel grid minimum zoom (percent)
            <input
              type="number"
              id="gridMinZoom"
              min="200"
              max="6400"
              step="50"
              .value=${String(Math.round(this.gridMinZoom*100))}
              @input=${()=>this.applyGridFromDialog()}
            />
          </label>
          ${Math.abs(this.gridMinZoom-nd.minZoom)>1e-9?L`<button
                class="reset-btn"
                aria-label="Reset pixel grid minimum zoom to default"
                title="Reset to default"
                @click=${()=>this.resetGridMinZoomToDefault()}
              >
                ↻
              </button>`:L``}
        </div>
        <div class="settings-section">Canvas view</div>
        <div class="setting-row">
          <label
            >Canvas rotation step (degrees)
            <input
              type="number"
              id="rotationStep"
              min="1"
              max="90"
              step="1"
              .value=${String(this.rotationStepDeg)}
              @input=${()=>this.applyRotationFromDialog()}
            />
          </label>
          ${this.rotationStepDeg===ud.stepDeg?L``:L`<button
                class="reset-btn"
                aria-label="Reset canvas rotation step to default"
                title="Reset to default"
                @click=${()=>this.resetRotationStepToDefault()}
              >
                ↻
              </button>`}
        </div>
        <div class="settings-section">Animation</div>
        <div class="setting-row">
          <label
            >Default frame duration (ms)
            <input
              type="number"
              id="defaultFrameDuration"
              min="1"
              max="60000"
              step="10"
              .value=${String(Math.round(this.defaultFrameDuration))}
              @input=${()=>this.applyDefaultFrameDurationFromDialog()}
            />
          </label>
          ${this.defaultFrameDuration===100?L``:L`<button
                class="reset-btn"
                aria-label="Reset default frame duration to default"
                title="Reset to default"
                @click=${()=>this.resetDefaultFrameDuration()}
              >
                ↻
              </button>`}
        </div>
        <div class="settings-section">Interface</div>
        <div class="setting-row">
          <label
            >Toast display time (seconds)
            <input
              type="number"
              id="toastDuration"
              min="0.5"
              max="2"
              step="0.1"
              .value=${String(this.toastDurationSec)}
              @input=${()=>this.applyToastFromDialog()}
            />
          </label>
          ${Math.abs(this.toastDurationSec-vp.durationSec)>1e-9?L`<button
                class="reset-btn"
                aria-label="Reset toast display time to default"
                title="Reset to default"
                @click=${()=>this.resetToastDurationToDefault()}
              >
                ↻
              </button>`:L``}
        </div>
        <div class="setting-row">
          <label
            >Fit texture default alpha threshold
            <input
              type="number"
              id="fitDefaultThreshold"
              min="0"
              max="254"
              step="1"
              .value=${String(this.fitDefaultThreshold)}
              @input=${()=>this.applyFitFromDialog()}
            />
          </label>
          ${this.fitDefaultThreshold===Ep.alphaThreshold?L``:L`<button
                class="reset-btn"
                aria-label="Reset fit alpha threshold to default"
                title="Reset to default"
                @click=${()=>this.resetFitToDefault()}
              >
                ↻
              </button>`}
        </div>
        <div class="dialog-actions">
          <button @click=${()=>this.resetCheckerDefaults()}>Reset defaults</button>
          <button @click=${()=>this.closeSettingsDialog()}>Close</button>
        </div>
      </dialog>
      <dialog id="frameDurationDialog">
        <h3>Frame duration</h3>
        <p>How long this frame shows during playback. Empty means the project default.</p>
        <label
          >Duration (ms)
          <input
            type="number"
            id="frameDuration"
            min="1"
            max="60000"
            step="10"
            placeholder=${String(Math.round(this.defaultFrameDuration))}
            .value=${this.durationValue===null?``:String(this.durationValue)}
          />
        </label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeFrameDurationDialog()}>Cancel</button>
          <button @click=${()=>this.clearFrameDuration()}>Clear</button>
          <button @click=${()=>this.confirmFrameDuration()}>Set</button>
        </div>
      </dialog>
      <dialog id="frameRenameDialog">
        <h3>Rename frame</h3>
        <label
          >Frame name
          <input type="text" id="frameRename" maxlength="64" .value=${this.frameRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeFrameRenameDialog()}>Cancel</button>
          <button @click=${()=>this.confirmFrameRename()}>Rename</button>
        </div>
      </dialog>
      <dialog id="layerRenameDialog">
        <h3>Rename layer</h3>
        <label
          >Layer name
          <input type="text" id="layerRename" maxlength="64" .value=${this.layerRenameValue()} />
        </label>
        <div class="dialog-actions">
          <button @click=${()=>this.closeLayerRenameDialog()}>Cancel</button>
          <button @click=${()=>this.confirmLayerRename()}>Rename</button>
        </div>
      </dialog>
      ${this.contentPickerTarget===null?L``:this.renderContentPickerDialog()}
      ${this.texturePickerContentId===null?L``:this.renderTexturePickerDialog()}
    `}toolDisplayName(e){return e===`transform`?`non-destructive cell transform`:e===`transform3d`?`3d rotation`:e===`destransform`?`destructive selection transform`:e===`destransform3d`?`destructive 3d rotation`:e===`rectselect`?`rectangular selection`:e}renderBlendModeOption(){return L`
      <label
        >Blend mode
        <select id="blendMode" .value=${this.blendMode} @change=${()=>this.applyBlendModeFromDialog()}>
          <option value="normal">Normal</option>
          <option value="copy">Copy</option>
          <option value="eraser">Eraser</option>
        </select>
      </label>
    `}renderAccumulateOption(){return L`
      <label
        ><input
          type="checkbox"
          id="accumulate"
          .checked=${this.accumulate}
          @change=${()=>this.applyAccumulateFromDialog()}
        />
        Accumulate
      </label>
    `}renderStabilizerOption(){return L`
      <label
        >Stabilizer
        <select
          id="stabilizerMode"
          .value=${this.stabilizerMode}
          @change=${()=>this.applyStabilizerModeFromDialog()}
        >
          <option value="none">None</option>
          <option value="rope">Rope</option>
          <option value="follow">Follow</option>
        </select>
      </label>
      ${this.stabilizerMode===`rope`?L`
            <label
              >Rope length
              <input
                type="number"
                id="ropeLength"
                min="1"
                max="200"
                step="1"
                .value=${String(this.ropeLength)}
                @input=${()=>this.applyRopeLengthFromDialog()}
              />
            </label>
          `:L``}
      ${this.stabilizerMode===`follow`?L`
            <label
              >Follow strength
              <input
                type="number"
                id="followStrength"
                min="1"
                max="100"
                step="1"
                .value=${String(this.followStrength)}
                @input=${()=>this.applyFollowStrengthFromDialog()}
              />
            </label>
          `:L``}
    `}renderToolOptions(){return this.tool===`pencil`?L`
        <div class="tool-options" data-testid="tool-options" aria-label="Pencil options" ?hidden=${this.uiHidden}>
          <label
            >Brush size
            <input
              type="number"
              id="brushSize"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.brushSize)}
              @input=${()=>this.applyBrushSizeFromDialog()}
            />
          </label>
          <label
            >Brush shape
            <select id="brushShape" .value=${this.brushShape} @change=${()=>this.applyBrushShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="pencilAntialias"
              .checked=${this.pencilAntialias}
              @change=${()=>this.applyPencilAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          <label title="Keeps 1px strokes exactly 1px thick. Only applies at brush size 1 without anti-aliasing."
            ><input
              type="checkbox"
              id="pencilPixelPerfect"
              .checked=${this.pencilPixelPerfect}
              ?disabled=${this.brushSize!==1||this.pencilAntialias}
              @change=${()=>this.applyPencilPixelPerfectFromDialog()}
            />
            Pixel perfect
          </label>
          ${this.renderStabilizerOption()} ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `:this.tool===`line`?L`
        <div class="tool-options" data-testid="tool-options" aria-label="Line options" ?hidden=${this.uiHidden}>
          <label
            >Line width
            <input
              type="number"
              id="lineWidth"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.lineWidth)}
              @input=${()=>this.applyLineWidthFromDialog()}
            />
          </label>
          <label
            >Line shape
            <select id="lineShape" .value=${this.lineShape} @change=${()=>this.applyLineShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="lineAntialias"
              .checked=${this.lineAntialias}
              @change=${()=>this.applyLineAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `:this.tool===`curve`?L`
        <div class="tool-options" data-testid="tool-options" aria-label="Curve options" ?hidden=${this.uiHidden}>
          <label
            >Curve width
            <input
              type="number"
              id="curveWidth"
              min="0.1"
              max="64"
              step="0.1"
              .value=${String(this.curveWidth)}
              @input=${()=>this.applyCurveWidthFromDialog()}
            />
          </label>
          <label
            >Curve shape
            <select id="curveShape" .value=${this.curveShape} @change=${()=>this.applyCurveShapeFromDialog()}>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
          </label>
          <label
            ><input
              type="checkbox"
              id="curveAntialias"
              .checked=${this.curveAntialias}
              @change=${()=>this.applyCurveAntialiasFromDialog()}
            />
            Anti-aliasing
          </label>
          <label title="Keeps 1px curves exactly 1px thick. Only applies at curve width 1 without anti-aliasing."
            ><input
              type="checkbox"
              id="curvePixelPerfect"
              .checked=${this.curvePixelPerfect}
              ?disabled=${this.curveWidth!==1||this.curveAntialias}
              @change=${()=>this.applyCurvePixelPerfectFromDialog()}
            />
            Pixel perfect
          </label>
          ${this.renderBlendModeOption()} ${this.renderAccumulateOption()}
        </div>
      `:this.tool===`bucket`?L`
        <div class="tool-options" data-testid="tool-options" aria-label="Bucket options" ?hidden=${this.uiHidden}>
          ${this.renderBlendModeOption()}
        </div>
      `:this.tool===`destransform`||this.tool===`destransform3d`?L`
        <div class="tool-options" data-testid="tool-options" aria-label="Destructive selection transform options" ?hidden=${this.uiHidden}>
          <button
            ?disabled=${!this.floatingActive}
            title="Merge the floating selection into the cell (Enter)"
            @click=${()=>this.commitFloatingSelection()}
          >
            Commit selection
          </button>
        </div>
      `:L`
      <div class="tool-options" data-testid="tool-options" aria-label="${this.toolDisplayName(this.tool)} options" ?hidden=${this.uiHidden}>
        <span class="tool-options-empty"
          >the ${this.toolDisplayName(this.tool)} tool does not have any setting or helper button</span
        >
      </div>
    `}renderAnimationMatrix(){if(this.engine===null)return L``;let e=this.engine.getAnimationMatrix(),t=`120px repeat(${e.frameCount}, 76px)`;return L`
      <div class="anim-matrix" data-testid="animation-matrix" aria-label="Animation matrix" ?hidden=${this.uiHidden}>
        <div class="anim-scroll">
          <div class="anim-grid" style="grid-template-columns: ${t};">
            <div class="anim-corner">
              <button aria-label="Add frame" title="Add frame" @click=${()=>this.onAddFrame()}>+</button>
              <button
                aria-label=${this.playing?`Stop animation`:`Play animation`}
                title=${this.playing?`Stop animation`:`Play animation`}
                @click=${()=>this.togglePlayback()}
                >${this.playing?`■`:`▶`}</button
              >
            </div>
            ${Array.from({length:e.frameCount},(t,n)=>{let r=n===e.currentFrame,i=this.engine?.getEffectiveFrameDuration(n)??0,a=e.frameNames[n]??`Frame ${n+1}`,o=this.renamingFrame===n;return L`
                <div class="anim-frame-header ${r?`current`:``}">
                  ${o?L`<input
                        data-testid="anim-frame-rename"
                        data-frame=${n}
                        .value=${a}
                        maxlength="64"
                        aria-label="Rename frame ${n+1}"
                        @click=${e=>e.stopPropagation()}
                        @keydown=${e=>{e.key===`Enter`?this.onFrameRenameCommit(n):e.key===`Escape`&&this.onFrameRenameCancel(),e.stopPropagation()}}
                        @blur=${()=>this.onFrameRenameCommit(n)}
                      />`:L`<button
                        data-testid="anim-frame"
                        data-frame=${n}
                        aria-label="Frame ${n+1}${r?`, current`:``}: ${a}, ${i} milliseconds"
                        title="Frame ${n+1}${r?` (current)`:``}: ${a} — ${i} ms"
                        @click=${()=>this.onSelectFrame(n)}
                        @dblclick=${()=>this.onFrameRenameStart(n)}
                        @contextmenu=${e=>{e.preventDefault(),this.openMatrixFrameMenu(n,e.clientX,e.clientY)}}
                        >${a}</button
                      >`}
                </div>
              `})}
            ${e.rows.map(t=>L`
                <div
                  class="anim-layer-name"
                  title=${t.layerName}
                  data-testid="anim-layer-name"
                  data-matrix-layer=${t.layerId}
                  role="button"
                  tabindex="0"
                  aria-label="Animation layer ${t.layerName}"
                  @contextmenu=${e=>{e.preventDefault(),this.openMatrixLayerMenu(t.layerId,e.clientX,e.clientY)}}
                >
                  ${t.layerName}
                </div>
                ${t.cells.map(n=>{let r=n.layerId===e.activeLayerId&&n.frame===e.currentFrame,i=n.frame===e.currentFrame,a=n.contentName??`empty`;return L`
                    <div
                      class="anim-cell ${n.contentId===null?``:`filled`} ${i?`current-frame`:``} ${r?`active-cell`:``}"
                      data-testid="anim-cell"
                      data-matrix-layer=${n.layerId}
                      data-matrix-frame=${n.frame}
                      role="button"
                      tabindex="0"
                      aria-label="Animation cell, layer ${t.layerName}, frame ${n.frame+1}, ${a}"
                      title="Layer ${t.layerName}, frame ${n.frame+1}: ${a}"
                      @click=${()=>this.onCellClick(n.layerId,n.frame)}
                      @keydown=${e=>{(e.key===`Enter`||e.key===` `)&&(e.preventDefault(),this.onCellClick(n.layerId,n.frame))}}
                      @contextmenu=${e=>{e.preventDefault(),this.openMatrixCellMenu(n.layerId,n.frame,e.clientX,e.clientY)}}
                    >
                      ${n.contentName===null?L`<span aria-hidden="true">—</span>`:L`<span class="cell-name">${n.contentName}</span>`}
                    </div>
                  `})}
              `)}
          </div>
        </div>
      </div>
    `}renderMatrixMenu(){if(this.matrixMenu===null||this.engine===null)return L``;if(this.matrixMenu.kind===`frame`){let e=this.matrixMenu.frame,t=this.engine.getFrameCount();return L`
        <div class="context-blocker" @click=${()=>this.closeMatrixMenu()} @contextmenu=${e=>{e.preventDefault(),this.closeMatrixMenu()}}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${()=>this.onAddFrameBefore(e)}>Add frame before</button>
          <button @click=${()=>this.onAddFrameAfter(e)}>Add frame after</button>
          <button @click=${()=>this.onOpenFrameDuration()}>Set frame duration…</button>
          <button @click=${()=>this.onRenameFrameFromMenu()}>Rename frame…</button>
          <button ?disabled=${t<=1} @click=${()=>this.onRemoveFrame(e)}>Remove frame</button>
        </div>
      `}if(this.matrixMenu.kind===`layer`)return L`
        <div class="context-blocker" @click=${()=>this.closeMatrixMenu()} @contextmenu=${e=>{e.preventDefault(),this.closeMatrixMenu()}}></div>
        <div class="context-menu" style="left: ${this.matrixMenu.x}px; top: ${this.matrixMenu.y}px;">
          <button @click=${()=>this.onRenameLayerFromMenu()}>Rename layer…</button>
        </div>
      `;let e=this.matrixMenu,t=e.kind===`cell`?this.engine.getCellTextureId(e.layerId,e.frame):null;return L`
      <div class="context-blocker" @click=${()=>this.closeMatrixMenu()} @contextmenu=${e=>{e.preventDefault(),this.closeMatrixMenu()}}></div>
      <div class="context-menu" style="left: ${e.x}px; top: ${e.y}px;">
        <button @click=${()=>void this.onOpenContentPicker()}>Select content</button>
        <button ?disabled=${t===null} @click=${()=>this.onOpenFitTextureFromCell()}>
          Fit texture to size
        </button>
        <button ?disabled=${t===null} @click=${()=>this.onCropCellToCanvasFromCell()}>
          Crop to canvas
        </button>
      </div>
    `}updated(){this.fitContextMenusToViewport()}fitContextMenusToViewport(){let e=this.shadowRoot;if(e!=null)for(let t of Array.from(e.querySelectorAll(`.context-menu`))){let e=t,n=e.getBoundingClientRect();if(n.width<=0&&n.height<=0)continue;let r=0,i=0;if(n.right>window.innerWidth-8?r=n.right-(window.innerWidth-8):n.left<8&&(r=n.left-8),n.bottom>window.innerHeight-8?i=n.bottom-(window.innerHeight-8):n.top<8&&(i=n.top-8),r!==0){let t=Number.parseFloat(e.style.left||`0`)||0;e.style.left=`${t-r}px`}if(i!==0){let t=Number.parseFloat(e.style.top||`0`)||0;e.style.top=`${t-i}px`}}}firstUpdated(){this.fsSupported=dp(),window.addEventListener(`keydown`,this.onGlobalKeyDown);let e=this.loadCheckerSettings();this.checkerMode=e.mode,this.checkerSizeX=e.sizeX,this.checkerSizeY=e.sizeY,this.checkerColorA=e.colorA,this.checkerColorB=e.colorB;let t=this.loadGridSettings();this.gridMinZoom=t.minZoom;let n=this.loadRotationSettings();this.rotationStepDeg=n.stepDeg;let r=this.loadBackgroundSettings();this.backgroundMode=r.mode,this.backgroundColor=r.color;let i=this.loadToastSettings();this.toastDurationSec=i.durationSec;let a=this.loadFitSettings();this.fitDefaultThreshold=a.alphaThreshold;let o=this.shadowRoot?.getElementById(`canvasHost`)??null;if(o===null)this.webglError=`Canvas host is missing.`;else try{this.engine=new Qf(o,{onToolChanged:e=>{this.tool=e},onLayersChanged:()=>{this.refreshLayers()},checker:e,gridMinZoom:t.minZoom,background:r,onStats:e=>{this.zoomText=`${Math.round(e.zoom*100)}%`,this.canUndo=e.canUndo,this.canRedo=e.canRedo,this.rotText=`${Math.round(e.rotationDeg)}°`,this.flipText=e.flipX&&e.flipY?`Flip XY`:e.flipX?`Flip X`:e.flipY?`Flip Y`:``,this.cursorText=e.cursorX===null||e.cursorY===null?`-`:`${e.cursorX}, ${e.cursorY}`,this.canvasText=`${e.width} x ${e.height}`},onPixelsChanged:()=>{this.dirty=!0,this.refreshPreview()},onEyedropperPick:e=>{this.setPencilColor(e),this.statusMessage=`Eyedropper: ${e}`},onTransformChanged:()=>{this.refreshPreview()},onToolSizeChanged:(e,t)=>{e===`brush`?(this.brushSize=t,this.statusMessage=`Brush size: ${t}`):e===`line`?(this.lineWidth=t,this.statusMessage=`Line width: ${t}`):(this.curveWidth=t,this.statusMessage=`Curve width: ${t}`)}}),this.engine.setColor(this.colorValue),this.engine.setRotationStepDeg(this.rotationStepDeg),this.engine.setStabilizerMode(this.stabilizerMode),this.engine.setRopeLength(this.ropeLength),this.engine.setFollowStrength(this.followStrength),this.engine.setPencilPixelPerfect(this.pencilPixelPerfect),this.engine.setCurvePixelPerfect(this.curvePixelPerfect),this.refreshLayers(),this.fitInitialView(),this.fsSupported||(this.statusMessage=`File System Access API unavailable (use Chromium)`),window.__gnumarus={shell:this,engine:this.engine}}catch(e){this.webglError=e instanceof Xf?e.message:`Failed to start WebGL2 canvas.`}}async fitInitialView(){try{await this.updateComplete}catch{return}this.isConnected&&this.engine?.resetViewTransform()}onGlobalKeyDown=e=>{let t=e.key.toLowerCase();if((e.ctrlKey||e.metaKey)&&!e.altKey&&t===`s`)e.preventDefault(),this.saveProject();else if((e.ctrlKey||e.metaKey)&&!e.altKey&&t===`e`)e.preventDefault(),this.mergeActiveLayerDown();else if(e.key===`Tab`){if(this.shadowRoot?.querySelector(`dialog[open]`)!==null||this.eventInField(e))return;e.preventDefault(),this.uiHidden=!this.uiHidden}else if(e.key===`Escape`)this.matrixMenu!==null&&(this.matrixMenu=null),this.contextMenuLayerId!==null&&this.closeLayerMenu(),this.renamingFrame!==null&&(this.renamingFrame=null),this.renamingId!==null&&(this.renamingId=null);else if(!(e.ctrlKey||e.altKey||e.metaKey)&&this.shadowRoot?.querySelector(`dialog[open]`)===null&&!this.eventInField(e)){if(e.key===`PageUp`)e.preventDefault(),this.selectLayerRelative(1);else if(e.key===`PageDown`)e.preventDefault(),this.selectLayerRelative(-1);else if(e.key===`Insert`)e.preventDefault(),this.insertLayerAboveActive();else if(e.key===`ArrowLeft`||e.key===`ArrowRight`||e.key===`ArrowUp`||e.key===`ArrowDown`){if(this.eventInColorPicker(e))return;if(e.preventDefault(),e.shiftKey){e.key===`ArrowLeft`?this.moveCurrentFrame(-1):e.key===`ArrowRight`?this.moveCurrentFrame(1):e.key===`ArrowUp`?this.moveActiveLayer(`up`):this.moveActiveLayer(`down`);return}e.key===`ArrowLeft`?this.selectFrameRelative(-1):e.key===`ArrowRight`?this.selectFrameRelative(1):e.key===`ArrowUp`?this.selectLayerRelative(1):this.selectLayerRelative(-1)}else(e.key===`e`||e.key===`E`)&&(e.preventDefault(),this.toggleEraserBlend())}};eventInColorPicker(e){if(typeof e.composedPath==`function`){for(let t of e.composedPath())if(t instanceof Element&&t.localName===`gnumarus-color-picker`)return!0}let t=e.target;return t instanceof HTMLElement&&t.closest(`gnumarus-color-picker`)!==null}eventInField(e){if(typeof e.composedPath==`function`){for(let t of e.composedPath())if(t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||t instanceof HTMLElement&&t.isContentEditable)return!0}let t=e.target;return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement}showToast(e){this.toastMessage=e,this.toastTimer!==null&&window.clearTimeout(this.toastTimer);let t=Math.round(Cp(this.toastDurationSec)*1e3);this.toastTimer=window.setTimeout(()=>{this.toastMessage=``,this.toastTimer=null},t)}layerToastFor(e,t,n){return`${e+1}/${t}: ${n}`}frameToastFor(e,t){let n=this.engine?.getFrameName(e)??`Frame ${e+1}`;return`Frame ${e+1}/${t}: ${n}`}selectLayerRelative(e){if(this.engine===null||this.layers.length===0)return;let t=this.layers.findIndex(e=>e.id===this.activeLayerId),n=((t<0?this.layers.length-1:t)+e+this.layers.length)%this.layers.length,r=this.layers[n];r!==void 0&&this.engine.setActiveLayer(r.id)&&(this.refreshLayers(),this.showToast(this.layerToastFor(n,this.layers.length,r.name)))}insertLayerAboveActive(){this.engine!==null&&(this.engine.insertLayerAboveActive(),this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer added`)}selectFrameRelative(e){if(this.engine===null)return;let t=this.engine.getFrameCount();if(t<=0)return;let n=(this.engine.getCurrentFrame()+e+t)%t;this.engine.setCurrentFrame(n)&&(this.refreshLayers(),this.showToast(this.frameToastFor(n,t)))}moveCurrentFrame(e){if(this.engine===null)return;let t=this.engine.getCurrentFrame();this.engine.moveFrame(t,e)&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame moved ${e===1?`right`:`left`}`)}moveActiveLayer(e){this.engine!==null&&this.engine.moveLayerWrapping(this.engine.getActiveLayerId(),e)&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer moved ${e}`)}mergeActiveLayerDown(){this.engine!==null&&(this.engine.mergeDown(this.engine.getActiveLayerId())?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layers merged`):this.statusMessage=`Nothing below to merge with`)}openNewDialog(){this.fileMenuOpen=!1,(this.shadowRoot?.getElementById(`newDialog`))?.showModal()}closeNewDialog(){(this.shadowRoot?.getElementById(`newDialog`))?.close()}openResizeDialog(e){let t=this.layers.find(t=>t.id===e);t!==void 0&&(this.resizingLayerId=e,this.resizeWidth=t.width,this.resizeHeight=t.height,this.requestUpdate(),(this.shadowRoot?.getElementById(`resizeDialog`))?.showModal())}closeResizeDialog(){(this.shadowRoot?.getElementById(`resizeDialog`))?.close(),this.resizingLayerId=null}confirmResize(){let e=this.resizingLayerId;if(e===null||this.engine===null){this.closeResizeDialog();return}let t=this.shadowRoot?.getElementById(`resizeWidth`),n=this.shadowRoot?.getElementById(`resizeHeight`),r=Math.min(1024,Math.max(1,Math.floor(Number(t?.value??`1`)||1))),i=Math.min(1024,Math.max(1,Math.floor(Number(n?.value??`1`)||1)));this.resizeWidth=r,this.resizeHeight=i,this.engine.resizeLayer(e,r,i)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer resized to ${r} x ${i}`):this.statusMessage=`Layer size unchanged`,this.closeResizeDialog()}resetCanvasTransform(){this.editMenuOpen=!1,this.fileMenuOpen=!1,this.engine?.resetViewTransform(),this.statusMessage=`Canvas transform reset`}doUndo(){this.editMenuOpen=!1,this.fileMenuOpen=!1,this.statusMessage=this.engine?.undo()===!0?`Undo`:`Nothing to undo`}doRedo(){this.editMenuOpen=!1,this.fileMenuOpen=!1,this.statusMessage=this.engine?.redo()===!0?`Redo`:`Nothing to redo`}openSettingsDialog(){this.editMenuOpen=!1,this.fileMenuOpen=!1,(this.shadowRoot?.getElementById(`settingsDialog`))?.showModal()}closeSettingsDialog(){(this.shadowRoot?.getElementById(`settingsDialog`))?.close()}loadCheckerSettings(){try{let e=window.localStorage.getItem(Yu);if(e!==null)return ed(e)}catch{}return{...Ju}}loadGridSettings(){try{let e=window.localStorage.getItem(rd);if(e!==null)return sd(e)}catch{}return{...nd}}currentDialogGridMinZoom(){let e=this.shadowRoot?.getElementById(`gridMinZoom`),t=Number(e?.value??`1000`)||1e3;return od(Math.min(6400,Math.max(200,Math.floor(t)))/100)}applyGridFromDialog(){let e=this.currentDialogGridMinZoom();this.gridMinZoom=e,this.engine?.setGridMinZoom(e),this.persistGrid(),this.statusMessage=`Pixel grid minimum zoom: ${Math.round(e*100)}%`}loadRotationSettings(){try{let e=window.localStorage.getItem(dd);if(e!==null)return hd(e)}catch{}return{...ud}}persistRotation(){try{window.localStorage.setItem(dd,gd({stepDeg:this.rotationStepDeg}))}catch{}}currentDialogRotationStep(){let e=this.shadowRoot?.getElementById(`rotationStep`),t=Number(e?.value??String(ud.stepDeg));return md(Number.isFinite(t)?Math.floor(t):ud.stepDeg)}applyRotationFromDialog(){let e=this.currentDialogRotationStep();this.rotationStepDeg=e,this.engine?.setRotationStepDeg(e),this.persistRotation(),this.statusMessage=`Canvas rotation step: ${e}°`}resetRotationStepToDefault(){this.rotationStepDeg=ud.stepDeg,this.engine?.setRotationStepDeg(this.rotationStepDeg),this.persistRotation(),this.statusMessage=`Canvas rotation step reset to default`}loadToastSettings(){try{let e=window.localStorage.getItem(yp);if(e!==null)return wp(e)}catch{}return{...vp}}persistToast(){try{window.localStorage.setItem(yp,Tp({durationSec:this.toastDurationSec}))}catch{}}currentDialogToastDuration(){let e=this.shadowRoot?.getElementById(`toastDuration`),t=Number(e?.value??String(vp.durationSec));return Cp(Number.isFinite(t)?t:vp.durationSec)}applyToastFromDialog(){this.toastDurationSec=this.currentDialogToastDuration(),this.persistToast(),this.statusMessage=`Toast display time: ${this.toastDurationSec} s`}resetToastDurationToDefault(){this.toastDurationSec=vp.durationSec,this.persistToast(),this.statusMessage=`Toast display time reset to default`}setToastDurationSec(e){this.toastDurationSec=Cp(e),this.persistToast(),this.statusMessage=`Toast display time: ${this.toastDurationSec} s`}loadFitSettings(){try{let e=window.localStorage.getItem(Dp);if(e!==null)return jp(e)}catch{}return{...Ep}}persistFit(){try{window.localStorage.setItem(Dp,Mp({alphaThreshold:this.fitDefaultThreshold}))}catch{}}currentDialogFitThreshold(){let e=this.shadowRoot?.getElementById(`fitDefaultThreshold`),t=Number(e?.value??String(Ep.alphaThreshold));return Ap(Number.isFinite(t)?t:Ep.alphaThreshold)}applyFitFromDialog(){this.fitDefaultThreshold=this.currentDialogFitThreshold(),this.persistFit(),this.statusMessage=`Fit texture default alpha threshold: ${this.fitDefaultThreshold}`}resetFitToDefault(){this.fitDefaultThreshold=Ep.alphaThreshold,this.persistFit(),this.statusMessage=`Fit texture default alpha threshold reset to default`}setFitDefaultThreshold(e){this.fitDefaultThreshold=Ap(e),this.persistFit(),this.statusMessage=`Fit texture default alpha threshold: ${this.fitDefaultThreshold}`}renameFrame(e,t){return this.engine?.renameFrame(e,t)===!0&&(this.dirty=!0,this.statusMessage=`Frame renamed`,this.refreshLayers(),!0)}loadBackgroundSettings(){try{let e=window.localStorage.getItem(Nd);if(e!==null)return Ld(e)}catch{}return{...Md}}persistBackground(){try{window.localStorage.setItem(Nd,Rd({mode:this.backgroundMode,color:this.backgroundColor}))}catch{}}persistChecker(){try{window.localStorage.setItem(Yu,td({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}))}catch{}}persistGrid(){try{window.localStorage.setItem(rd,cd({minZoom:this.gridMinZoom}))}catch{}}currentDialogBackground(){let e=this.shadowRoot?.getElementById(`backgroundMode`),t=this.shadowRoot?.getElementById(`backgroundColor`),n=e?.value===`solid`?`solid`:`checkerboard`,r=t?.value??this.backgroundColor;return{mode:n,color:typeof r==`string`?r.slice(0,7):this.backgroundColor}}applyBackgroundFromDialog(){let e=this.currentDialogBackground();this.backgroundMode=e.mode,this.backgroundColor=e.color,this.engine?.applyBackgroundSettings(e),this.persistBackground(),this.refreshPreview(),this.statusMessage=e.mode===`solid`?`Canvas background: solid ${e.color}`:`Canvas background: checkerboard`}resetBackgroundModeToDefault(){this.backgroundMode=Md.mode,this.engine?.setBackgroundMode(this.backgroundMode),this.persistBackground(),this.refreshPreview(),this.statusMessage=`Background mode reset to default`}resetBackgroundColorToDefault(){this.backgroundColor=Md.color,this.engine?.setBackgroundColor(this.backgroundColor),this.persistBackground(),this.refreshPreview(),this.statusMessage=`Background color reset to default`}resetCheckerModeToDefault(){this.checkerMode=Ju.mode,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checkerboard mode reset to default`}resetCheckerSizeXToDefault(){this.checkerSizeX=Ju.sizeX,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker width reset to default`}resetCheckerSizeYToDefault(){this.checkerSizeY=Ju.sizeY,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker height reset to default`}resetCheckerColorAToDefault(){this.checkerColorA=Ju.colorA,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker color A reset to default`}resetCheckerColorBToDefault(){this.checkerColorB=Ju.colorB,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker color B reset to default`}setPencilColor(e){let t=Qd(e);t!==null&&(this.colorValue=Xd(t),this.engine?.setColor(this.colorValue))}setBrushSize(e){let t=Ql(e);this.brushSize=t,this.engine?.setBrushSize(t),this.statusMessage=`Brush size: ${t}`}setBrushShape(e){let t=eu(e);this.brushShape=t,this.engine?.setBrushShape(t),this.statusMessage=`Brush shape: ${t}`}currentDialogBrushSize(){let e=this.shadowRoot?.getElementById(`brushSize`),t=Number(e?.value??`1`);return Ql(Number.isFinite(t)?t:1)}currentDialogBrushShape(){let e=this.shadowRoot?.getElementById(`brushShape`);return eu(e?.value??`square`)}applyBrushSizeFromDialog(){let e=this.currentDialogBrushSize();this.brushSize=e,this.engine?.setBrushSize(e),this.statusMessage=`Brush size: ${e}`}applyBrushShapeFromDialog(){let e=this.currentDialogBrushShape();this.brushShape=e,this.engine?.setBrushShape(e),this.statusMessage=`Brush shape: ${e}`}setPencilAntialias(e){let t=e===!0;this.pencilAntialias=t,this.engine?.setPencilAntialias(t),this.statusMessage=`Pencil anti-aliasing: ${t?`on`:`off`}`}currentDialogPencilAntialias(){return this.shadowRoot?.getElementById(`pencilAntialias`)?.checked===!0}applyPencilAntialiasFromDialog(){let e=this.currentDialogPencilAntialias();this.pencilAntialias=e,this.engine?.setPencilAntialias(e),this.statusMessage=`Pencil anti-aliasing: ${e?`on`:`off`}`}setPencilPixelPerfect(e){let t=e===!0;this.pencilPixelPerfect=t,this.engine?.setPencilPixelPerfect(t),this.statusMessage=`Pencil pixel perfect: ${t?`on`:`off`}`}setCurvePixelPerfect(e){let t=e===!0;this.curvePixelPerfect=t,this.engine?.setCurvePixelPerfect(t),this.statusMessage=`Curve pixel perfect: ${t?`on`:`off`}`}currentDialogPencilPixelPerfect(){return this.shadowRoot?.getElementById(`pencilPixelPerfect`)?.checked===!0}currentDialogCurvePixelPerfect(){return this.shadowRoot?.getElementById(`curvePixelPerfect`)?.checked===!0}applyPencilPixelPerfectFromDialog(){let e=this.currentDialogPencilPixelPerfect();this.pencilPixelPerfect=e,this.engine?.setPencilPixelPerfect(e),this.statusMessage=`Pencil pixel perfect: ${e?`on`:`off`}`}applyCurvePixelPerfectFromDialog(){let e=this.currentDialogCurvePixelPerfect();this.curvePixelPerfect=e,this.engine?.setCurvePixelPerfect(e),this.statusMessage=`Curve pixel perfect: ${e?`on`:`off`}`}setStabilizerMode(e){let t=Hu(e);this.stabilizerMode=t,this.engine?.setStabilizerMode(t),this.statusMessage=`Stabilizer: ${t}`}setRopeLength(e){let t=Uu(e);this.ropeLength=t,this.engine?.setRopeLength(t),this.statusMessage=`Rope length: ${t}`}setFollowStrength(e){let t=Wu(e);this.followStrength=t,this.engine?.setFollowStrength(t),this.statusMessage=`Follow strength: ${t}`}currentDialogStabilizerMode(){let e=this.shadowRoot?.getElementById(`stabilizerMode`);return Hu(e?.value??`none`)}currentDialogRopeLength(){let e=this.shadowRoot?.getElementById(`ropeLength`),t=Number(e?.value??`20`);return Uu(Number.isFinite(t)?t:20)}currentDialogFollowStrength(){let e=this.shadowRoot?.getElementById(`followStrength`),t=Number(e?.value??`20`);return Wu(Number.isFinite(t)?t:20)}applyStabilizerModeFromDialog(){let e=this.currentDialogStabilizerMode();this.stabilizerMode=e,this.engine?.setStabilizerMode(e),this.statusMessage=`Stabilizer: ${e}`}applyRopeLengthFromDialog(){let e=this.currentDialogRopeLength();this.ropeLength=e,this.engine?.setRopeLength(e),this.statusMessage=`Rope length: ${e}`}applyFollowStrengthFromDialog(){let e=this.currentDialogFollowStrength();this.followStrength=e,this.engine?.setFollowStrength(e),this.statusMessage=`Follow strength: ${e}`}setBlendMode(e){let t=Pl(e);this.blendMode=t,this.engine?.setBlendMode(t),this.statusMessage=`Blend mode: ${t}`}currentDialogBlendMode(){let e=this.shadowRoot?.getElementById(`blendMode`);return Pl(e?.value??`normal`)}applyBlendModeFromDialog(){let e=this.currentDialogBlendMode();this.blendMode=e,this.engine?.setBlendMode(e),this.statusMessage=`Blend mode: ${e}`}setAccumulate(e){let t=e===!0;this.accumulate=t,this.engine?.setAccumulate(t),this.statusMessage=`Accumulate: ${t?`on`:`off`}`}currentDialogAccumulate(){return this.shadowRoot?.getElementById(`accumulate`)?.checked===!0}applyAccumulateFromDialog(){let e=this.currentDialogAccumulate();this.accumulate=e,this.engine?.setAccumulate(e),this.statusMessage=`Accumulate: ${e?`on`:`off`}`}toggleEraserBlend(){if(this.engine===null)return;let e=this.engine.toggleEraserBlend();this.blendMode=e,this.statusMessage=`Blend mode: ${e}`}setLineWidth(e){let t=Ql(e);this.lineWidth=t,this.engine?.setLineWidth(t),this.statusMessage=`Line width: ${t}`}setLineShape(e){let t=eu(e);this.lineShape=t,this.engine?.setLineShape(t),this.statusMessage=`Line shape: ${t}`}setLineAntialias(e){let t=e===!0;this.lineAntialias=t,this.engine?.setLineAntialias(t),this.statusMessage=`Line anti-aliasing: ${t?`on`:`off`}`}currentDialogLineWidth(){let e=this.shadowRoot?.getElementById(`lineWidth`),t=Number(e?.value??`1`);return Ql(Number.isFinite(t)?t:1)}currentDialogLineShape(){let e=this.shadowRoot?.getElementById(`lineShape`);return eu(e?.value??`square`)}currentDialogLineAntialias(){return this.shadowRoot?.getElementById(`lineAntialias`)?.checked===!0}applyLineWidthFromDialog(){let e=this.currentDialogLineWidth();this.lineWidth=e,this.engine?.setLineWidth(e),this.statusMessage=`Line width: ${e}`}applyLineShapeFromDialog(){let e=this.currentDialogLineShape();this.lineShape=e,this.engine?.setLineShape(e),this.statusMessage=`Line shape: ${e}`}applyLineAntialiasFromDialog(){let e=this.currentDialogLineAntialias();this.lineAntialias=e,this.engine?.setLineAntialias(e),this.statusMessage=`Line anti-aliasing: ${e?`on`:`off`}`}setCurveWidth(e){let t=Ql(e);this.curveWidth=t,this.engine?.setCurveWidth(t),this.statusMessage=`Curve width: ${t}`}setCurveShape(e){let t=eu(e);this.curveShape=t,this.engine?.setCurveShape(t),this.statusMessage=`Curve shape: ${t}`}setCurveAntialias(e){let t=e===!0;this.curveAntialias=t,this.engine?.setCurveAntialias(t),this.statusMessage=`Curve anti-aliasing: ${t?`on`:`off`}`}currentDialogCurveWidth(){let e=this.shadowRoot?.getElementById(`curveWidth`),t=Number(e?.value??`1`);return Ql(Number.isFinite(t)?t:1)}currentDialogCurveShape(){let e=this.shadowRoot?.getElementById(`curveShape`);return eu(e?.value??`square`)}currentDialogCurveAntialias(){return this.shadowRoot?.getElementById(`curveAntialias`)?.checked===!0}applyCurveWidthFromDialog(){let e=this.currentDialogCurveWidth();this.curveWidth=e,this.engine?.setCurveWidth(e),this.statusMessage=`Curve width: ${e}`}applyCurveShapeFromDialog(){let e=this.currentDialogCurveShape();this.curveShape=e,this.engine?.setCurveShape(e),this.statusMessage=`Curve shape: ${e}`}applyCurveAntialiasFromDialog(){let e=this.currentDialogCurveAntialias();this.curveAntialias=e,this.engine?.setCurveAntialias(e),this.statusMessage=`Curve anti-aliasing: ${e?`on`:`off`}`}setCheckerColorA(e){let t=e.trim().toLowerCase().slice(0,7);pu(t)!==null&&t.length===7&&(this.checkerColorA=t,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker color A: ${t}`)}setCheckerColorB(e){let t=e.trim().toLowerCase().slice(0,7);pu(t)!==null&&t.length===7&&(this.checkerColorB=t,this.engine?.applyCheckerSettings({mode:this.checkerMode,sizeX:this.checkerSizeX,sizeY:this.checkerSizeY,colorA:this.checkerColorA,colorB:this.checkerColorB}),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checker color B: ${t}`)}setBackgroundColor(e){let t=e.trim().toLowerCase().slice(0,7);pu(t)!==null&&t.length===7&&(this.backgroundColor=t,this.engine?.applyBackgroundSettings({mode:this.backgroundMode,color:this.backgroundColor}),this.persistBackground(),this.refreshPreview(),this.statusMessage=`Canvas background: ${this.backgroundMode===`solid`?`solid ${t}`:`checkerboard`}`)}resetGridMinZoomToDefault(){this.gridMinZoom=nd.minZoom,this.engine?.setGridMinZoom(this.gridMinZoom),this.persistGrid(),this.statusMessage=`Pixel grid minimum zoom reset to default`}currentDialogChecker(){let e=this.shadowRoot?.getElementById(`checkerMode`),t=this.shadowRoot?.getElementById(`checkerSizeX`),n=this.shadowRoot?.getElementById(`checkerSizeY`),r=this.shadowRoot?.getElementById(`checkerColorA`),i=this.shadowRoot?.getElementById(`checkerColorB`),a=e?.value===`screen`?`screen`:`image`,o=r?.value??this.checkerColorA,s=i?.value??this.checkerColorB;return{mode:a,sizeX:$u(Number(t?.value??`16`)||16),sizeY:$u(Number(n?.value??`16`)||16),colorA:typeof o==`string`?o.slice(0,7):this.checkerColorA,colorB:typeof s==`string`?s.slice(0,7):this.checkerColorB}}applyCheckerFromDialog(){let e=this.currentDialogChecker();this.checkerMode=e.mode,this.checkerSizeX=e.sizeX,this.checkerSizeY=e.sizeY,this.checkerColorA=e.colorA,this.checkerColorB=e.colorB,this.engine?.applyCheckerSettings(e),this.persistChecker(),this.refreshPreview(),this.statusMessage=`Checkerboard: ${e.mode}-space, ${e.sizeX}x${e.sizeY}px`}resetCheckerDefaults(){let e={...Ju};this.checkerMode=e.mode,this.checkerSizeX=e.sizeX,this.checkerSizeY=e.sizeY,this.checkerColorA=e.colorA,this.checkerColorB=e.colorB,this.engine?.applyCheckerSettings(e),this.persistChecker();let t={...nd};this.gridMinZoom=t.minZoom,this.engine?.setGridMinZoom(t.minZoom),this.persistGrid();let n={...Md};this.backgroundMode=n.mode,this.backgroundColor=n.color,this.engine?.applyBackgroundSettings(n),this.persistBackground(),this.rotationStepDeg=ud.stepDeg,this.engine?.setRotationStepDeg(this.rotationStepDeg),this.persistRotation(),this.toastDurationSec=vp.durationSec,this.persistToast(),this.refreshPreview(),this.statusMessage=`Settings reset to defaults`}togglePreview(){this.previewOpen=!this.previewOpen,this.previewOpen?(this.statusMessage=`Final preview opened`,this.refreshPreview()):this.statusMessage=`Final preview closed`}zoomPreview(e){let t=Math.min(64,Math.max(.25,this.previewZoom*e));this.previewZoom=t,this.refreshPreview()}resetPreviewZoom(){this.previewZoom=4,this.refreshPreview()}previewDragState=null;previewPanState=null;onPreviewPanStart(e){if(e.button!==0&&e.button!==1&&e.button!==2)return;let t=e.currentTarget;if(t===null)return;e.preventDefault(),this.previewPanState={startX:e.clientX,startY:e.clientY,startLeft:t.scrollLeft,startTop:t.scrollTop,body:t};let n=e=>{this.previewPanState!==null&&(this.previewPanState.body.scrollLeft=this.previewPanState.startLeft-(e.clientX-this.previewPanState.startX),this.previewPanState.body.scrollTop=this.previewPanState.startTop-(e.clientY-this.previewPanState.startY))},r=()=>{this.previewPanState=null,window.removeEventListener(`pointermove`,n),window.removeEventListener(`pointerup`,r),window.removeEventListener(`pointercancel`,r)};window.addEventListener(`pointermove`,n),window.addEventListener(`pointerup`,r),window.addEventListener(`pointercancel`,r)}onPreviewDragStart(e){let t=e.target;if(t!==null&&t.closest(`button`)!==null)return;this.previewDragState={startX:e.clientX,startY:e.clientY,originX:this.previewX,originY:this.previewY};let n=e=>{this.previewDragState!==null&&(this.previewX=Math.max(0,this.previewDragState.originX+(e.clientX-this.previewDragState.startX)),this.previewY=Math.max(0,this.previewDragState.originY+(e.clientY-this.previewDragState.startY)))},r=()=>{this.previewDragState=null,window.removeEventListener(`pointermove`,n),window.removeEventListener(`pointerup`,r)};window.addEventListener(`pointermove`,n),window.addEventListener(`pointerup`,r)}async refreshPreview(){if(!this.previewOpen||this.engine===null)return;await this.updateComplete;let e=this.shadowRoot?.getElementById(`previewCanvas`);if(e===null)return;let t=this.engine.size,n=this.engine.getLayers(),r=this.engine.exportLayers(),i=n.map(e=>{let t=r.find(t=>t.id===e.id);if(t===void 0)throw Error(`Missing pixels for layer ${e.id}`);return{width:e.width,height:e.height,buffer:t.buffer,transform:{...e.transform},visible:e.visible,opacity:e.opacity}}),a=this.engine.getCheckerSettings(),o=this.engine.getBackgroundSettings(),s=Ip(t.width,t.height,i,{mode:o.mode,checkerMode:a.mode,sizeX:a.sizeX,sizeY:a.sizeY,colorA:a.colorA,colorB:a.colorB,color:o.color});e.width=t.width,e.height=t.height;let c=e.getContext(`2d`);if(c===null)return;let l=c.createImageData(t.width,t.height);l.data.set(s),c.putImageData(l,0,0);let u=Math.max(1,Math.round(t.width*this.previewZoom)),d=Math.max(1,Math.round(t.height*this.previewZoom));e.style.width=`${u}px`,e.style.height=`${d}px`}refreshLayers(){if(this.engine===null){this.layers=[],this.activeLayerId=``,this.floatingActive=!1,this.layerText=`-`,this.frameText=`Frame 1/1: Frame 1`;return}this.layers=this.engine.getLayers(),this.activeLayerId=this.engine.getActiveLayerId(),this.floatingActive=this.engine.hasFloatingSelection();let e=this.layers.findIndex(e=>e.id===this.activeLayerId),t=e<0?void 0:this.layers[e];this.layerText=t===void 0?`-`:`${t.name} (${this.layers.length-e}/${this.layers.length})`;let n=this.engine.getCurrentFrame(),r=this.engine.getFrameCount();this.frameText=`Frame ${n+1}/${r}: ${this.engine.getFrameName(n)}`,this.defaultFrameDuration=this.engine.getDefaultFrameDuration(),this.previewOpen&&this.refreshPreview()}onCellClick(e,t){if(this.engine===null)return;let n=this.engine.getActiveLayerId(),r=this.engine.getCurrentFrame(),i=e!==n,a=t!==r;if(!i&&!a)return;i&&this.engine.setActiveLayer(e),a&&this.engine.setCurrentFrame(t),this.refreshLayers();let o=this.layers.findIndex(e=>e.id===this.engine?.getActiveLayerId()),s=o<0?void 0:this.layers[o],c=this.engine.getFrameCount();i&&a&&s!==void 0?this.showToast(`${this.layerToastFor(o,this.layers.length,s.name)} — ${this.frameToastFor(t,c)}`):i&&s!==void 0?this.showToast(this.layerToastFor(o,this.layers.length,s.name)):a&&this.showToast(this.frameToastFor(t,c))}onSelectFrame(e){this.engine!==null&&this.engine.setCurrentFrame(e)&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame ${e+1} selected`,this.showToast(this.frameToastFor(e,this.engine.getFrameCount())))}onAddFrame(){if(this.engine===null)return;let e=this.engine.addFrame();this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame ${e+1} added`}onAddFrameBefore(e){if(this.closeMatrixMenu(),this.engine===null)return;let t=this.engine.insertFrame(e);t>=0&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame ${t+1} added`)}onAddFrameAfter(e){if(this.closeMatrixMenu(),this.engine===null)return;let t=this.engine.insertFrame(e+1);t>=0&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame ${t+1} added`)}onRemoveFrame(e){this.closeMatrixMenu(),this.engine!==null&&(this.engine.removeFrame(e)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame removed`):this.statusMessage=`Cannot remove the last frame`)}openMatrixCellMenu(e,t,n,r){this.closeLayerMenu(),this.matrixMenu={kind:`cell`,layerId:e,frame:t,x:n,y:r}}openMatrixLayerMenu(e,t,n){this.closeLayerMenu(),this.matrixMenu={kind:`layer`,layerId:e,x:Math.min(t,window.innerWidth-200),y:Math.min(n,window.innerHeight-80)}}openMatrixFrameMenu(e,t,n){this.closeLayerMenu(),this.matrixMenu={kind:`frame`,frame:e,x:t,y:n}}closeMatrixMenu(){this.matrixMenu=null}matrixCellTarget(){return this.matrixMenu===null||this.matrixMenu.kind!==`cell`?null:{layerId:this.matrixMenu.layerId,frame:this.matrixMenu.frame}}sortedContents(){return this.engine===null?[]:[...this.engine.getAnimationMatrix().contents].sort((e,t)=>e.name.localeCompare(t.name))}sortedTextures(){return this.engine===null?[]:[...this.engine.getAnimationMatrix().textures].sort((e,t)=>e.name.localeCompare(t.name))}thumbnailDataUrl(e){if(this.engine===null)return null;let t=this.engine.exportTextures().find(t=>t.id===e);if(t===void 0||t.width<1||t.height<1)return null;try{let e=document.createElement(`canvas`);e.width=t.width,e.height=t.height;let n=e.getContext(`2d`);if(n===null)return null;let r=new ImageData(new Uint8ClampedArray(t.buffer),t.width,t.height);return n.putImageData(r,0,0),e.toDataURL()}catch{return null}}renderContentPickerDialog(){return L`
      <dialog id="contentPickerDialog" @close=${()=>this.onContentPickerClosed()}>
        <h3>Select content</h3>
        <div class="picker-grid" data-testid="content-picker-grid">
          <button
            class="picker-item"
            data-testid="content-picker-none"
            @click=${()=>this.onContentPickerSelect(`none`)}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">No content</span>
          </button>
          <button
            class="picker-item"
            data-testid="content-picker-new"
            @click=${()=>this.onContentPickerSelect(`new`)}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">New content</span>
          </button>
          ${this.sortedContents().map(e=>{let t=e.textureId===null?null:this.thumbnailDataUrl(e.textureId);return L`
              <button
                class="picker-item"
                data-testid="content-picker-item"
                data-content-id=${e.id}
                title=${e.name}
                @click=${()=>this.onContentPickerSelect(e.id)}
              >
                ${t===null?L`<span class="picker-empty" aria-hidden="true">∅</span>`:L`<img class="picker-thumb" src=${t} alt="" data-texture-id=${e.textureId??``} />`}
                <span class="picker-name">${e.name}</span>
              </button>
            `})}
        </div>
        <div class="dialog-actions">
          <button @click=${()=>this.closeContentPicker()}>Cancel</button>
        </div>
      </dialog>
    `}renderTexturePickerDialog(){return L`
      <dialog id="texturePickerDialog" @close=${()=>this.onTexturePickerClosed()}>
        <h3>Select texture</h3>
        <div class="picker-grid" data-testid="texture-picker-grid">
          <button
            class="picker-item"
            data-testid="texture-picker-none"
            @click=${()=>this.onTexturePickerSelect(`none`)}
          >
            <span class="picker-empty" aria-hidden="true">∅</span>
            <span class="picker-name">No texture</span>
          </button>
          <button
            class="picker-item"
            data-testid="texture-picker-new"
            @click=${()=>this.onTexturePickerSelect(`new`)}
          >
            <span class="picker-empty" aria-hidden="true">+</span>
            <span class="picker-name">New texture</span>
          </button>
          ${this.sortedTextures().map(e=>{let t=this.thumbnailDataUrl(e.id);return L`
              <button
                class="picker-item"
                data-testid="texture-picker-item"
                data-texture-id=${e.id}
                title=${e.name}
                @click=${()=>this.onTexturePickerSelect(e.id)}
              >
                ${t===null?L`<span class="picker-empty" aria-hidden="true">∅</span>`:L`<img class="picker-thumb" src=${t} alt="" data-texture-id=${e.id} />`}
                <span class="picker-name">${e.name}</span>
              </button>
            `})}
        </div>
        <div class="dialog-actions">
          <button @click=${()=>this.closeTexturePicker()}>Cancel</button>
        </div>
      </dialog>
    `}async onOpenContentPicker(){let e=this.matrixCellTarget();this.closeMatrixMenu(),e!==null&&this.engine!==null&&(this.contentPickerTarget={...e},await this.updateComplete,(this.shadowRoot?.getElementById(`contentPickerDialog`))?.showModal())}onContentPickerClosed(){this.contentPickerTarget=null}closeContentPicker(){(this.shadowRoot?.getElementById(`contentPickerDialog`))?.close(),this.contentPickerTarget=null}onContentPickerSelect(e){let t=this.contentPickerTarget;if(t===null||this.engine===null)this.closeContentPicker();else if(e===`none`)this.engine.dissociateCellContent(t.layerId,t.frame)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Cell content dissociated`):this.statusMessage=`Cell is already empty`,this.closeContentPicker();else if(e===`new`){let e=this.engine.createEmptyContentForCell(t.layerId,t.frame);if(e===null){this.statusMessage=`Failed to create content`,this.closeContentPicker();return}this.refreshLayers(),this.dirty=!0,this.statusMessage=`Cell content created`,this.closeContentPicker(),this.openTexturePicker(e)}else this.engine.associateCellContent(t.layerId,t.frame,e)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Cell content associated`):this.statusMessage=`Cell already uses that content`,this.closeContentPicker()}async openTexturePicker(e){this.engine!==null&&(this.texturePickerContentId=e,await this.updateComplete,(this.shadowRoot?.getElementById(`texturePickerDialog`))?.showModal())}onTexturePickerClosed(){this.texturePickerContentId=null}closeTexturePicker(){(this.shadowRoot?.getElementById(`texturePickerDialog`))?.close(),this.texturePickerContentId=null}onTexturePickerSelect(e){let t=this.texturePickerContentId;if(t===null||this.engine===null)this.closeTexturePicker();else if(e===`none`)this.statusMessage=`Content left without texture`,this.refreshLayers(),this.closeTexturePicker();else if(e===`new`){let e=this.engine.createEmptyTexture();this.engine.associateContentTexture(t,e)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Content associated with texture`):this.statusMessage=`Failed to associate texture`,this.closeTexturePicker()}else this.engine.associateContentTexture(t,e)?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Content associated with texture`):this.statusMessage=`Content already uses that texture`,this.closeTexturePicker()}currentDialogDefaultFrameDuration(){let e=this.shadowRoot?.getElementById(`defaultFrameDuration`),t=Math.floor(Number(e?.value??`100`)||100);return Math.min(6e4,Math.max(1,t))}applyDefaultFrameDurationFromDialog(){let e=this.currentDialogDefaultFrameDuration();this.defaultFrameDuration=e,this.engine?.setDefaultFrameDuration(e),this.refreshLayers(),this.dirty=!0,this.statusMessage=`Default frame duration: ${e} ms`}resetDefaultFrameDuration(){this.defaultFrameDuration=100,this.engine?.setDefaultFrameDuration(100),this.refreshLayers(),this.dirty=!0,this.statusMessage=`Default frame duration reset to default`}openFrameDurationDialog(e){this.engine!==null&&(this.durationTargetFrame=e,this.durationValue=this.engine.getFrameDuration(e),this.requestUpdate(),(this.shadowRoot?.getElementById(`frameDurationDialog`))?.showModal())}onOpenFrameDuration(){if(this.matrixMenu===null||this.matrixMenu.kind!==`frame`){this.closeMatrixMenu();return}let e=this.matrixMenu.frame;this.closeMatrixMenu(),this.openFrameDurationDialog(e)}closeFrameDurationDialog(){(this.shadowRoot?.getElementById(`frameDurationDialog`))?.close(),this.durationTargetFrame=null}confirmFrameDuration(){let e=this.durationTargetFrame;if(e===null||this.engine===null){this.closeFrameDurationDialog();return}let t=(this.shadowRoot?.getElementById(`frameDuration`)?.value??``).trim();if(t===``)this.engine.setFrameDuration(e,null),this.statusMessage=`Frame ${e+1} uses the project default`;else{let n=Math.min(6e4,Math.max(1,Math.floor(Number(t)||0)));if(n<1){this.closeFrameDurationDialog();return}this.engine.setFrameDuration(e,n),this.statusMessage=`Frame ${e+1} duration: ${n} ms`}this.refreshLayers(),this.dirty=!0,this.closeFrameDurationDialog()}clearFrameDuration(){let e=this.durationTargetFrame;this.closeFrameDurationDialog(),e!==null&&this.engine!==null&&this.engine.setFrameDuration(e,null)&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Frame ${e+1} uses the project default`)}frameRenameTarget=null;frameRenameValue(){return this.frameRenameTarget===null||this.engine===null?``:this.engine.getFrameName(this.frameRenameTarget)}onFrameRenameStart(e){this.renamingFrame=e}onFrameRenameCancel(){this.renamingFrame=null}onFrameRenameCommit(e){if(this.renamingFrame!==e)return;this.renamingFrame=null;let t=this.shadowRoot?.querySelector(`[data-testid="anim-frame-rename"][data-frame="${e}"]`),n=t instanceof HTMLInputElement?t.value:``;n.trim().length===0||this.engine?.renameFrame(e,n)===!0&&(this.dirty=!0,this.statusMessage=`Frame renamed`),this.refreshLayers()}onRenameFrameFromMenu(){if(this.matrixMenu===null||this.matrixMenu.kind!==`frame`){this.closeMatrixMenu();return}let e=this.matrixMenu.frame;this.closeMatrixMenu(),this.openFrameRenameDialog(e)}openFrameRenameDialog(e){this.engine!==null&&(this.frameRenameTarget=e,this.requestUpdate(),(this.shadowRoot?.getElementById(`frameRenameDialog`))?.showModal())}closeFrameRenameDialog(){(this.shadowRoot?.getElementById(`frameRenameDialog`))?.close(),this.frameRenameTarget=null}confirmFrameRename(){let e=this.frameRenameTarget;if(e===null||this.engine===null){this.closeFrameRenameDialog();return}let t=this.shadowRoot?.getElementById(`frameRename`)?.value??``;t.trim().length===0||(this.engine.renameFrame(e,t)&&(this.dirty=!0,this.statusMessage=`Frame renamed`),this.refreshLayers()),this.closeFrameRenameDialog()}layerRenameTarget=null;layerRenameValue(){return this.layerRenameTarget===null||this.engine===null?``:this.engine.getLayers().find(e=>e.id===this.layerRenameTarget)?.name??``}onRenameLayerFromMenu(){if(this.matrixMenu===null||this.matrixMenu.kind!==`layer`){this.closeMatrixMenu();return}let e=this.matrixMenu.layerId;this.closeMatrixMenu(),this.openLayerRenameDialog(e)}openLayerRenameDialog(e){this.engine!==null&&(this.layerRenameTarget=e,this.requestUpdate(),(this.shadowRoot?.getElementById(`layerRenameDialog`))?.showModal())}closeLayerRenameDialog(){(this.shadowRoot?.getElementById(`layerRenameDialog`))?.close(),this.layerRenameTarget=null}confirmLayerRename(){let e=this.layerRenameTarget;if(e===null||this.engine===null){this.closeLayerRenameDialog();return}let t=this.shadowRoot?.getElementById(`layerRename`)?.value??``;t.trim().length===0?(this.refreshLayers(),this.closeLayerRenameDialog()):(this.engine.renameLayer(e,t)&&(this.dirty=!0,this.statusMessage=`Layer renamed`),this.refreshLayers(),this.closeLayerRenameDialog())}togglePlayback(){this.engine!==null&&(this.playing?this.stopPlayback(`Animation stopped`):(this.playing=!0,this.statusMessage=`Playing from frame ${this.engine.getCurrentFrame()+1}`,this.schedulePlaybackTick()))}stopPlayback(e=``){this.playTimer!==null&&(window.clearTimeout(this.playTimer),this.playTimer=null),this.playing&&(this.playing=!1,e!==``&&(this.statusMessage=e))}schedulePlaybackTick(){if(!this.playing||this.engine===null)return;let e=Math.max(1,this.engine.getEffectiveFrameDuration(this.engine.getCurrentFrame()));this.playTimer!==null&&window.clearTimeout(this.playTimer),this.playTimer=window.setTimeout(()=>{if(!this.playing||this.engine===null)return;let e=(this.engine.getCurrentFrame()+1)%Math.max(1,this.engine.getFrameCount());this.engine.setCurrentFrame(e),this.refreshLayers(),this.schedulePlaybackTick()},e)}onAddLayer(){this.engine!==null&&(this.engine.addLayer(),this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer added`)}onRemoveLayer(e){this.engine!==null&&(this.engine.removeLayer(e)?(this.statusMessage=`Layer deleted`,this.dirty=!0):this.statusMessage=`Cannot delete the last layer`,this.refreshLayers())}onSelectLayer(e){if(this.engine===null||e===this.activeLayerId)return;this.engine.setActiveLayer(e),this.refreshLayers();let t=this.layers.findIndex(t=>t.id===e),n=t<0?void 0:this.layers[t];n!==void 0&&this.showToast(this.layerToastFor(t,this.layers.length,n.name))}onToggleVisible(e,t){this.engine?.setLayerVisible(e,t),this.refreshLayers(),this.dirty=!0}onOpacityInput(e,t){this.engine?.setLayerOpacity(e,t),this.refreshLayers(),this.dirty=!0}onToggleChannelLock(e,t){if(this.engine===null)return;let n=this.engine.getLayers().find(t=>t.id===e)?.lockedChannels;if(n===void 0)return;let r=!n[t];this.engine.setLayerChannelLocked(e,t,r)&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=r?`${t.toUpperCase()} channel locked`:`${t.toUpperCase()} channel unlocked`)}onMoveLayer(e,t){this.engine?.moveLayer(e,t)===!0&&(this.statusMessage=`Layer moved ${t}`,this.dirty=!0),this.refreshLayers()}onAddLayerAbove(e){this.closeLayerMenu(),this.engine!==null&&this.engine.insertLayerAbove(e)!==null&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer added`)}onAddLayerBelow(e){this.closeLayerMenu(),this.engine!==null&&this.engine.insertLayerBelow(e)!==null&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer added`)}onRenameStart(e){this.renamingId=e}onRenameCancel(){this.renamingId=null}openLayerMenu(e,t,n){this.contextMenuLayerId=e,this.contextMenuX=t,this.contextMenuY=n}closeLayerMenu(){this.contextMenuLayerId=null}onMergeDown(e){this.closeLayerMenu(),this.engine?.mergeDown(e)===!0?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layers merged`):this.statusMessage=`Nothing below to merge with`}onResetLayerTransform(e){this.closeLayerMenu(),this.engine?.resetLayerTransform(e)===!0?(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Layer transform reset`):this.statusMessage=`Layer transform reset failed`}commitFloatingSelection(){this.engine?.commitFloating()===!0&&(this.refreshLayers(),this.dirty=!0,this.statusMessage=`Floating selection merged`)}fitTextureDisplayName(e){return this.engine?.getAnimationMatrix().textures.find(t=>t.id===e)?.name??e}onOpenFitTextureFromLayer(e){if(this.engine===null){this.closeLayerMenu();return}let t=this.engine.getCellTextureId(e,this.engine.getCurrentFrame());this.closeLayerMenu(),t===null?this.statusMessage=`Nothing to fit: the layer has no texture on this frame`:this.openFitTextureDialog(t)}onOpenFitTextureFromCell(){let e=this.matrixCellTarget();if(this.closeMatrixMenu(),e===null||this.engine===null)return;let t=this.engine.getCellTextureId(e.layerId,e.frame);t===null?this.statusMessage=`Nothing to fit: the cell has no texture`:this.openFitTextureDialog(t)}async openFitTextureDialog(e){this.engine!==null&&(this.fitTextureTarget={textureId:e,textureName:this.fitTextureDisplayName(e)},this.fitThreshold=this.fitDefaultThreshold,await this.updateComplete,(this.shadowRoot?.getElementById(`fitTextureDialog`))?.showModal(),(this.shadowRoot?.getElementById(`fitTextureOk`))?.focus())}closeFitTextureDialog(){(this.shadowRoot?.getElementById(`fitTextureDialog`))?.close(),this.fitTextureTarget=null}confirmFitTexture(){let e=this.fitTextureTarget;if(e===null||this.engine===null){this.closeFitTextureDialog();return}let t=this.shadowRoot?.getElementById(`fitThreshold`),n=Number(t?.value??`0`),r=Number.isFinite(n)?Math.min(254,Math.max(0,Math.floor(n))):0;if(this.fitThreshold=r,this.engine.fitTextureToSize(e.textureId,r)){this.refreshLayers(),this.dirty=!0;let t=this.engine.exportTextures().find(t=>t.id===e.textureId);this.statusMessage=t===void 0?`Texture fitted to size`:`Texture fitted to ${t.width} x ${t.height}`}else this.statusMessage=`Nothing to fit: texture is empty or already fits`;this.closeFitTextureDialog()}onCropCellToCanvasFromLayer(e){if(this.engine===null){this.closeLayerMenu();return}let t=this.engine.getCurrentFrame(),n=this.engine.cropCellTextureToCanvas(e,t);this.closeLayerMenu(),this.reportCropToCanvasOutcome(n,e,t)}onCropCellToCanvasFromCell(){let e=this.matrixCellTarget();this.closeMatrixMenu(),e!==null&&this.engine!==null&&this.reportCropToCanvasOutcome(this.engine.cropCellTextureToCanvas(e.layerId,e.frame),e.layerId,e.frame)}reportCropToCanvasOutcome(e,t,n){if(e===`cropped`){this.refreshLayers(),this.dirty=!0;let e=this.engine?.getCellTextureId(t,n)??null,r=e===null?void 0:this.engine?.exportTextures().find(t=>t.id===e);this.statusMessage=r===void 0?`Texture cropped to canvas`:`Texture cropped to ${r.width} x ${r.height}`}else this.statusMessage=e===`outside`?`Cannot crop: cell content is fully outside the canvas`:`Nothing to crop: texture is already inside the canvas`}openShortcutsDialog(){this.helpMenuOpen=!1,this.requestUpdate(),(this.shadowRoot?.getElementById(`shortcutsDialog`))?.showModal()}closeShortcutsDialog(){(this.shadowRoot?.getElementById(`shortcutsDialog`))?.close()}onRenameCommit(e){if(this.renamingId!==e)return;this.renamingId=null;let t=this.shadowRoot?.querySelector(`[data-layer-id="${e}"] input.layer-rename`),n=t instanceof HTMLInputElement?t.value:``;n.trim().length===0||this.engine?.renameLayer(e,n)===!0&&(this.dirty=!0,this.statusMessage=`Layer renamed`),this.refreshLayers()}async createNew(){this.stopPlayback();let e=this.shadowRoot?.getElementById(`newWidth`),t=this.shadowRoot?.getElementById(`newHeight`),n=Math.min(1024,Math.max(1,Number(e?.value??`64`)||64)),r=Math.min(1024,Math.max(1,Number(t?.value??`64`)||64));this.newWidth=Math.floor(n),this.newHeight=Math.floor(r),this.engine?.newProject(this.newWidth,this.newHeight),this.refreshLayers(),this.directoryHandle=null,this.projectName=`Untitled`,this.dirty=!0,this.statusMessage=`New ${this.newWidth} x ${this.newHeight} canvas`,this.closeNewDialog()}async openProject(){if(this.fileMenuOpen=!1,!dp())this.statusMessage=`Open requires the File System Access API (Chromium)`;else{this.stopPlayback();try{this.statusMessage=`Opening directory...`;let e=await pp(),{project:t,fileBlobs:n}=await gp(e),r=[];for(let e of t.animation.textures){let t=n.get(e.file);if(t===void 0)throw Error(`Missing texture file: ${e.file}`);let i=await Rp(t);if(i.width!==e.width||i.height!==e.height)throw Error(`Texture size mismatch: ${e.file}`);r.push({id:e.id,name:e.name,width:i.width,height:i.height,buffer:i.buffer})}this.engine?.loadAnimationProject(t.width,t.height,{layers:t.layers.map(e=>({id:e.id,name:e.name,visible:e.visible,opacity:e.opacity,lockedChannels:{...e.lockedChannels}})),textures:r,contents:t.animation.contents.map(e=>({id:e.id,name:e.name,textureId:e.textureId,transform:{...e.transform}})),cells:t.animation.cells.map(e=>({...e})),frames:t.animation.frames,currentFrame:t.animation.currentFrame,defaultFrameDuration:t.animation.defaultFrameDuration,frameDurations:t.animation.frameDurations.map(e=>({...e})),frameNames:[...t.animation.frameNames]}),this.refreshLayers(),this.directoryHandle=e,this.projectName=e.name,this.dirty=!1,this.statusMessage=`Opened ${e.name}`}catch(e){this.statusMessage=e instanceof Error?`Open failed: ${e.message}`:`Open failed`}}}async importAseprite(){if(this.fileMenuOpen=!1,!fp()){this.statusMessage=`Import requires the File System Access API (Chromium)`;return}this.stopPlayback();let e;try{e=await mp()}catch(e){if(e instanceof DOMException&&e.name===`AbortError`)return;let t=e instanceof Error?e.message:String(e);console.error(`Aseprite import failed: ${t}`),this.statusMessage=`Import failed: ${t}`,this.showToast(`Import failed: ${t}`);return}if(e!==null)try{this.statusMessage=`Importing...`;let t=await e.getFile(),n=await mm(new Uint8Array(await t.arrayBuffer())),r=t.name,i=r.lastIndexOf(`.`);this.engine?.loadAnimationProject(n.width,n.height,{layers:n.layers.map(e=>({id:e.id,name:e.name,visible:e.visible,opacity:e.opacity,lockedChannels:{...e.lockedChannels}})),textures:n.textures.map(e=>({id:e.id,name:e.name,width:e.width,height:e.height,buffer:e.buffer})),contents:n.contents.map(e=>({id:e.id,name:e.name,textureId:e.textureId,transform:{...e.transform}})),cells:n.cells.map(e=>({...e})),frames:n.frames,currentFrame:0,defaultFrameDuration:n.defaultFrameDuration,frameDurations:n.frameDurations.map(e=>({...e})),frameNames:[]}),this.refreshLayers(),this.directoryHandle=null,this.projectName=i>0?r.slice(0,i):r,this.dirty=!0;let a=`Imported ${r} (${n.layers.length} layers, ${n.frames} frames)`;this.statusMessage=a,this.showToast(a)}catch(e){let t=e instanceof Error?e.message:String(e);console.error(`Aseprite import failed: ${t}`),this.statusMessage=`Import failed: ${t}`,this.showToast(`Import failed: ${t}`)}}async saveProject(){if(this.fileMenuOpen=!1,this.engine!==null){if(!dp())this.statusMessage=`Save requires the File System Access API (Chromium)`;else try{this.statusMessage=`Saving...`;let e=this.directoryHandle??await pp(),t=this.engine.size,n=this.engine.exportAnimationProject(),r=[],i=new Map;for(let e of n.textures){let t=tp(e.id);r.push({id:e.id,name:e.name,width:e.width,height:e.height,file:t}),i.set(t,await Lp(e.buffer,e.width,e.height))}let a=n.contents.map(e=>({id:e.id,name:e.name,textureId:e.textureId,transform:{...e.transform}}));await _p(e,{app:$f,version:1,width:t.width,height:t.height,layers:n.layers.map(e=>({id:e.id,name:e.name,visible:e.visible,opacity:e.opacity,lockedChannels:{...e.lockedChannels}})),animation:{frames:n.frames,currentFrame:n.currentFrame,defaultFrameDuration:n.defaultFrameDuration,frameDurations:n.frameDurations.map(e=>({...e})),frameNames:[...n.frameNames],textures:r,contents:a,cells:n.cells.map(e=>({...e}))}},i),this.directoryHandle=e,this.projectName=e.name,this.dirty=!1,this.statusMessage=`Saved to ${e.name}`}catch(e){this.statusMessage=e instanceof Error?`Save failed: ${e.message}`:`Save failed`}}}};customElements.define(`gnumarus-shell`,wm);