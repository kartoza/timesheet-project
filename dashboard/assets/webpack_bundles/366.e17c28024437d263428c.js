"use strict";(self.webpackChunkdashboard=self.webpackChunkdashboard||[]).push([[366],{25089:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)((0,s.jsx)("path",{d:"M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"}),"EmojiEvents");e.Z=i},75503:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)((0,s.jsx)("path",{d:"M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"}),"KeyboardArrowDown");e.Z=i},90813:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)((0,s.jsx)("path",{d:"M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"}),"KeyboardArrowUp");e.Z=i},92173:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)([(0,s.jsx)("path",{d:"M18 6.41 16.59 5 12 9.58 7.41 5 6 6.41l6 6z"},"0"),(0,s.jsx)("path",{d:"m18 13-1.41-1.41L12 16.17l-4.59-4.58L6 13l6 6z"},"1")],"KeyboardDoubleArrowDown");e.Z=i},1462:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)([(0,s.jsx)("path",{d:"M6 17.59 7.41 19 12 14.42 16.59 19 18 17.59l-6-6z"},"0"),(0,s.jsx)("path",{d:"m6 11 1.41 1.41L12 7.83l4.59 4.58L18 11l-6-6z"},"1")],"KeyboardDoubleArrowUp");e.Z=i},94895:function(t,e,n){var o=n(64836);e.Z=void 0;var r=o(n(64938)),s=n(85893),i=(0,r.default)((0,s.jsx)("path",{d:"M19 13H5v-2h14v2z"}),"Remove");e.Z=i},29861:function(t,e,n){var o=n(67294),r=n(63961),s=n(15463),i=n(59254),a=n(90948),d=n(39321),l=n(28628),c=n(96798),u=n(51705),p=n(59773),v=n(27037),f=n(68686),g=n(79685),m=n(85893);const h=(0,a.ZP)("div",{name:"MuiListItem",slot:"Root",overridesResolver:(t,e)=>{const{ownerState:n}=t;return[e.root,n.dense&&e.dense,"flex-start"===n.alignItems&&e.alignItemsFlexStart,n.divider&&e.divider,!n.disableGutters&&e.gutters,!n.disablePadding&&e.padding,n.hasSecondaryAction&&e.secondaryAction]}})((0,d.Z)((({theme:t})=>({display:"flex",justifyContent:"flex-start",alignItems:"center",position:"relative",textDecoration:"none",width:"100%",boxSizing:"border-box",textAlign:"left",variants:[{props:({ownerState:t})=>!t.disablePadding,style:{paddingTop:8,paddingBottom:8}},{props:({ownerState:t})=>!t.disablePadding&&t.dense,style:{paddingTop:4,paddingBottom:4}},{props:({ownerState:t})=>!t.disablePadding&&!t.disableGutters,style:{paddingLeft:16,paddingRight:16}},{props:({ownerState:t})=>!t.disablePadding&&!!t.secondaryAction,style:{paddingRight:48}},{props:({ownerState:t})=>!!t.secondaryAction,style:{[`& > .${f.Z.root}`]:{paddingRight:48}}},{props:{alignItems:"flex-start"},style:{alignItems:"flex-start"}},{props:({ownerState:t})=>t.divider,style:{borderBottom:`1px solid ${(t.vars||t).palette.divider}`,backgroundClip:"padding-box"}},{props:({ownerState:t})=>t.button,style:{transition:t.transitions.create("background-color",{duration:t.transitions.duration.shortest}),"&:hover":{textDecoration:"none",backgroundColor:(t.vars||t).palette.action.hover,"@media (hover: none)":{backgroundColor:"transparent"}}}},{props:({ownerState:t})=>t.hasSecondaryAction,style:{paddingRight:48}}]})))),x=(0,a.ZP)("li",{name:"MuiListItem",slot:"Container",overridesResolver:(t,e)=>e.container})({position:"relative"}),Z=o.forwardRef((function(t,e){const n=(0,l.i)({props:t,name:"MuiListItem"}),{alignItems:a="center",children:d,className:f,component:Z,components:b={},componentsProps:y={},ContainerComponent:S="li",ContainerProps:{className:j,...w}={},dense:I=!1,disableGutters:A=!1,disablePadding:L=!1,divider:P=!1,secondaryAction:M,slotProps:z={},slots:C={},...R}=n,G=o.useContext(p.Z),N=o.useMemo((()=>({dense:I||G.dense||!1,alignItems:a,disableGutters:A})),[a,G.dense,I,A]),k=o.useRef(null),B=o.Children.toArray(d),D=B.length&&(0,c.Z)(B[B.length-1],["ListItemSecondaryAction"]),F={...n,alignItems:a,dense:N.dense,disableGutters:A,disablePadding:L,divider:P,hasSecondaryAction:D},V=(t=>{const{alignItems:e,classes:n,dense:o,disableGutters:r,disablePadding:i,divider:a,hasSecondaryAction:d}=t,l={root:["root",o&&"dense",!r&&"gutters",!i&&"padding",a&&"divider","flex-start"===e&&"alignItemsFlexStart",d&&"secondaryAction"],container:["container"]};return(0,s.Z)(l,v.o,n)})(F),H=(0,u.Z)(k,e),K=C.root||b.Root||h,E=z.root||y.root||{},O={className:(0,r.Z)(V.root,E.className,f),...R};let T=Z||"li";return D?(T=O.component||Z?T:"div","li"===S&&("li"===T?T="div":"li"===O.component&&(O.component="div")),(0,m.jsx)(p.Z.Provider,{value:N,children:(0,m.jsxs)(x,{as:S,className:(0,r.Z)(V.container,j),ref:H,ownerState:F,...w,children:[(0,m.jsx)(K,{...E,...!(0,i.Z)(K)&&{as:T,ownerState:{...F,...E.ownerState}},...O,children:B}),B.pop()]})})):(0,m.jsx)(p.Z.Provider,{value:N,children:(0,m.jsxs)(K,{...E,as:T,ref:H,...!(0,i.Z)(K)&&{ownerState:{...F,...E.ownerState}},...O,children:[B,M&&(0,m.jsx)(g.Z,{children:M})]})})}));e.ZP=Z},27037:function(t,e,n){n.d(e,{o:function(){return s}});var o=n(45154),r=n(22104);function s(t){return(0,r.ZP)("MuiListItem",t)}(0,o.Z)("MuiListItem",["root","container","dense","alignItemsFlexStart","divider","gutters","padding","secondaryAction"])},68686:function(t,e,n){n.d(e,{t:function(){return s}});var o=n(45154),r=n(22104);function s(t){return(0,r.ZP)("MuiListItemButton",t)}const i=(0,o.Z)("MuiListItemButton",["root","focusVisible","dense","alignItemsFlexStart","disabled","divider","gutters","selected"]);e.Z=i},79685:function(t,e,n){var o=n(67294),r=n(63961),s=n(15463),i=n(90948),a=n(28628),d=n(59773),l=n(49126),c=n(85893);const u=(0,i.ZP)("div",{name:"MuiListItemSecondaryAction",slot:"Root",overridesResolver:(t,e)=>{const{ownerState:n}=t;return[e.root,n.disableGutters&&e.disableGutters]}})({position:"absolute",right:16,top:"50%",transform:"translateY(-50%)",variants:[{props:({ownerState:t})=>t.disableGutters,style:{right:0}}]}),p=o.forwardRef((function(t,e){const n=(0,a.i)({props:t,name:"MuiListItemSecondaryAction"}),{className:i,...p}=n,v=o.useContext(d.Z),f={...n,disableGutters:v.disableGutters},g=(t=>{const{disableGutters:e,classes:n}=t,o={root:["root",e&&"disableGutters"]};return(0,s.Z)(o,l.A,n)})(f);return(0,c.jsx)(u,{className:(0,r.Z)(g.root,i),ownerState:f,ref:e,...p})}));p.muiName="ListItemSecondaryAction",e.Z=p},49126:function(t,e,n){n.d(e,{A:function(){return s}});var o=n(45154),r=n(22104);function s(t){return(0,r.ZP)("MuiListItemSecondaryAction",t)}(0,o.Z)("MuiListItemSecondaryAction",["root","disableGutters"])},16366:function(t,e,n){n.r(e),n.d(e,{default:function(){return h}});var o=n(85893),r=n(21987),s=n(23972),i=n(18843),a=n(29861),d=n(67294),l=n(90813),c=n(1462),u=n(92173),p=n(25089),v=n(75503),f=n(94895),g=function(){return g=Object.assign||function(t){for(var e,n=1,o=arguments.length;n<o;n++)for(var r in e=arguments[n])Object.prototype.hasOwnProperty.call(e,r)&&(t[r]=e[r]);return t},g.apply(this,arguments)};function m(t){return"up"===t.status?(0,o.jsx)(l.Z,{sx:{color:"green"}}):"down"===t.status?(0,o.jsx)(v.Z,{sx:{color:"red"}}):"upup"===t.status?(0,o.jsx)(c.Z,{sx:{color:"green"}}):"downdown"===t.status?(0,o.jsx)(u.Z,{sx:{color:"red"}}):(0,o.jsx)(f.Z,{})}function h(t){var e=(0,d.useState)(null),n=e[0],l=e[1];return(0,d.useEffect)((function(){fetch("/api/user-leaderboard/").then((function(t){return t.json()})).then((function(t){return l(t)}))}),[]),(0,o.jsxs)(r.Z,g({className:"leaderboard-container"},{children:[(0,o.jsx)(s.Z,g({fontSize:15},{children:"Leaderboard"})),(0,o.jsx)(i.Z,{children:n?n.leaderboard.map((function(t,e){return(0,o.jsxs)(a.ZP,g({style:{display:"flex",paddingTop:2,paddingLeft:4,paddingBottom:2},divider:!0},{children:[(0,o.jsx)(s.Z,g({fontSize:10,style:{paddingRight:6}},{children:(0,o.jsx)(m,{status:t.status})})),(0,o.jsx)(s.Z,g({fontSize:12,align:"left"},{children:t.name.split(" ")[0]})),0==e?(0,o.jsx)(p.Z,{style:{color:"color(srgb 0.906 0.7592 0.2892)"}}):null,(0,o.jsx)(s.Z,g({fontSize:12,style:{marginLeft:"auto"}},{children:t.hours.toFixed(2)}))]}),"leaderboard-"+e)})):(0,o.jsx)(s.Z,g({fontSize:10},{children:"Fetching..."}))})]}))}}}]);