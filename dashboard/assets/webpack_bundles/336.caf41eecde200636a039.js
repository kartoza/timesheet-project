"use strict";(self.webpackChunkdashboard=self.webpackChunkdashboard||[]).push([[336],{61349:function(e,t,n){var o=n(8081),r=n.n(o),i=n(23645),l=n.n(i)()(r());l.push([e.id,".ql-snow .ql-editor code,.ql-snow .ql-editor pre{background-color:#222 !important}.ql-editor a{color:#000 !important;background-color:unset !important}.ql-container{font-size:20px}[data-mui-color-scheme=dark] .ql-editor a{color:#fff !important;background-color:unset !important}",""]),t.Z=l},54336:function(e,t,n){n.r(t),n.d(t,{default:function(){return A}});var o=n(85893),r=n(99226),i=n(18843),l=n(51652),a=n(59334),c=n(54893),u=n(79316),s=n(81497),d=n(32715),f=n(11188),h=n(67294),p=(n(95097),n(93622)),g=n(93379),v=n.n(g),m=n(7795),b=n.n(m),x=n(90569),k=n.n(x),y=n(3565),w=n.n(y),j=n(19216),Z=n.n(j),E=n(44589),C=n.n(E),S=n(61349),q={};q.styleTagTransform=C(),q.setAttributes=w(),q.insert=k().bind(null,"head"),q.domAPI=b(),q.insertStyleElement=Z(),v()(S.Z,q),S.Z&&S.Z.locals&&S.Z.locals;var T=n(48885),z=n(71167),D=function(){return D=Object.assign||function(e){for(var t,n=1,o=arguments.length;n<o;n++)for(var r in t=arguments[n])Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e},D.apply(this,arguments)},I=h.lazy((function(){return Promise.resolve().then(n.t.bind(n,71167,23))})),O=h.lazy((function(){return n.e(21).then(n.bind(n,96021))})),P=z.Quill.import("delta"),R=[{icon:(0,o.jsx)(c.Z,{}),detail:"It's quick, I will have it done in less than 1 hour.",value:1},{icon:(0,o.jsx)(u.Z,{}),detail:"Give me 2 hours and I will have it for you.",value:2},{icon:(0,o.jsx)(s.Z,{}),detail:"It will take me between 2 hours to half a day.",value:3},{icon:(0,o.jsx)(d.Z,{}),detail:"It will take between half a day and a full day.",value:5},{icon:(0,o.jsx)(f.Z,{}),detail:"This is a full day job.",value:8}];function A(e){var t=(0,h.useState)(!1),n=t[0],c=t[1],u=(0,h.useState)({top:0,left:0}),s=u[0],d=u[1],f=(0,h.useRef)(null),g=(0,h.useRef)(null),v=(0,h.useState)(0),m=v[0],b=v[1];(0,h.useEffect)((function(){n&&b(1)}),[n]),(0,h.useEffect)((function(){f.current&&f.current.getEditor().clipboard.addMatcher(Node.ELEMENT_NODE,(function(e,t){return t.compose((new P).retain(t.length(),{color:!1,background:!1,bold:!1,strike:!1,underline:!1}))}))}),[f.current]);var x=(0,h.useCallback)((function(t){if(!f.current||!g.current)return!1;var o=f.current.getEditor(),r=g.current.getBoundingClientRect(),i=o.getSelection();if(i){var l=o.getBounds(i.index);d({top:r.top+l.top,left:r.left+l.left});var a=new RegExp("(".concat("\\[","</()>?(\\w+[</(\\w+)>]+))$"),"g");t.match(a)&&(c(!0),setTimeout((function(){o.focus()}),100))}n&&t.match(/<br>/g)&&(!e.value.match(/<br>/g)||t.match(/<br>/g).length>e.value.match(/<br>/g).length)||e.onChange(t)}),[f,g,n]),k=function(t){void 0===t&&(t=null);try{var n=f.current.getEditor(),o=R[t||m-1],r=e.value;e.onChange(r.replace("".concat("[","</"),"[".concat(o.value,"]&nbsp;</"))),setTimeout((function(){n.setSelection(n.getSelection().index+12,0)}),100)}catch(e){return void console.log(e)}},y=function(e){if(n)if(38===e.keyCode&&m>1)e.preventDefault(),b(m-1);else if(40===e.keyCode&&m<R.length)e.preventDefault(),b(m+1);else if(13===e.keyCode){e.preventDefault(),e.stopPropagation();var t=f.current.getEditor();t.setSelection(t.getSelection().index-1,0),k(),c(!1)}else c(!1)};return(0,o.jsxs)(h.Suspense,D({fallback:(0,o.jsx)(p.Z,{})},{children:[(0,o.jsx)(O,D({id:"size-popover",open:n,anchorReference:"anchorPosition",anchorPosition:s,onClick:function(e){c(!1);var t=f.current.getEditor();t.focus(),setTimeout((function(){t.setSelection(t.getSelection().index+12,0)}),100)},onKeyDown:y,anchorOrigin:{vertical:"top",horizontal:"left"},transformOrigin:{vertical:"top",horizontal:"left"},disableAutoFocus:!0},{children:(0,o.jsx)(r.Z,D({sx:{width:"100%",maxWidth:360,bgcolor:"background.paper"}},{children:(0,o.jsx)(i.Z,D({component:"nav",dense:!0},{children:R.map((function(e,t){return(0,o.jsxs)(l.Z,D({onClick:function(e){return function(e){b(e+1),k(e)}(t)},disableRipple:!0,dense:!0,selected:m==t+1},{children:[(0,o.jsx)(T.Z,{children:e.icon}),(0,o.jsx)(a.Z,{primary:e.detail})]}),t)}))}))}))})),(0,o.jsx)("div",D({ref:g},{children:(0,o.jsx)(I,{ref:f,formats:e.format,modules:e.modules,theme:"snow",value:e.value,onChange:x,style:e.style,onKeyDown:y})}))]}))}}}]);