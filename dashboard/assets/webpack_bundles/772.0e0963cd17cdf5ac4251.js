"use strict";(self.webpackChunkdashboard=self.webpackChunkdashboard||[]).push([[772,797],{80878:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3z"}),"AccountTree")},72428:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"}),"Add")},10206:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-5 14H7v-2h7zm3-4H7v-2h10zm0-4H7V7h10z"}),"Article")},51797:function(e,t,o){o.r(t);var r=o(15949),a=o(85893);t.default=(0,r.Z)((0,a.jsx)("path",{d:"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75z"}),"Edit")},70062:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8z"}),"Folder")},38807:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5m-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4zm-3-4h8v2H8z"}),"LinkOutlined")},56914:function(e,t,o){var r=o(15949),a=o(85893);t.Z=(0,r.Z)((0,a.jsx)("path",{d:"M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2M9 11H7V9h2zm4 0h-2V9h2zm4 0h-2V9h2z"}),"Textsms")},82060:function(e,t,o){o.d(t,{Z:function(){return S}});var r=o(67294),a=o(63961),n=o(35971),i=o(94780),p=o(9652),s=o(14136),l=o(90948),c=o(53065),d=o(28628),u=o(43980),m=o(98216),h=o(40902),v=o(97933),g=r.createContext({}),f=r.createContext(void 0),y=o(85893);const b=[{props:{size:"small"},style:{"& > *:nth-of-type(1)":{fontSize:18}}},{props:{size:"medium"},style:{"& > *:nth-of-type(1)":{fontSize:20}}},{props:{size:"large"},style:{"& > *:nth-of-type(1)":{fontSize:22}}}],x=(0,l.ZP)(u.Z,{shouldForwardProp:e=>(0,s.Z)(e)||"classes"===e,name:"MuiButton",slot:"Root",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.root,t[o.variant],t[`${o.variant}${(0,m.Z)(o.color)}`],t[`size${(0,m.Z)(o.size)}`],t[`${o.variant}Size${(0,m.Z)(o.size)}`],"inherit"===o.color&&t.colorInherit,o.disableElevation&&t.disableElevation,o.fullWidth&&t.fullWidth]}})((0,c.Z)((({theme:e})=>{const t="light"===e.palette.mode?e.palette.grey[300]:e.palette.grey[800],o="light"===e.palette.mode?e.palette.grey.A100:e.palette.grey[700];return{...e.typography.button,minWidth:64,padding:"6px 16px",border:0,borderRadius:(e.vars||e).shape.borderRadius,transition:e.transitions.create(["background-color","box-shadow","border-color","color"],{duration:e.transitions.duration.short}),"&:hover":{textDecoration:"none"},[`&.${v.Z.disabled}`]:{color:(e.vars||e).palette.action.disabled},variants:[{props:{variant:"contained"},style:{color:"var(--variant-containedColor)",backgroundColor:"var(--variant-containedBg)",boxShadow:(e.vars||e).shadows[2],"&:hover":{boxShadow:(e.vars||e).shadows[4],"@media (hover: none)":{boxShadow:(e.vars||e).shadows[2]}},"&:active":{boxShadow:(e.vars||e).shadows[8]},[`&.${v.Z.focusVisible}`]:{boxShadow:(e.vars||e).shadows[6]},[`&.${v.Z.disabled}`]:{color:(e.vars||e).palette.action.disabled,boxShadow:(e.vars||e).shadows[0],backgroundColor:(e.vars||e).palette.action.disabledBackground}}},{props:{variant:"outlined"},style:{padding:"5px 15px",border:"1px solid currentColor",borderColor:"var(--variant-outlinedBorder, currentColor)",backgroundColor:"var(--variant-outlinedBg)",color:"var(--variant-outlinedColor)",[`&.${v.Z.disabled}`]:{border:`1px solid ${(e.vars||e).palette.action.disabledBackground}`}}},{props:{variant:"text"},style:{padding:"6px 8px",color:"var(--variant-textColor)",backgroundColor:"var(--variant-textBg)"}},...Object.entries(e.palette).filter((0,h.Z)()).map((([t])=>({props:{color:t},style:{"--variant-textColor":(e.vars||e).palette[t].main,"--variant-outlinedColor":(e.vars||e).palette[t].main,"--variant-outlinedBorder":e.vars?`rgba(${e.vars.palette[t].mainChannel} / 0.5)`:(0,p.Fq)(e.palette[t].main,.5),"--variant-containedColor":(e.vars||e).palette[t].contrastText,"--variant-containedBg":(e.vars||e).palette[t].main,"@media (hover: hover)":{"&:hover":{"--variant-containedBg":(e.vars||e).palette[t].dark,"--variant-textBg":e.vars?`rgba(${e.vars.palette[t].mainChannel} / ${e.vars.palette.action.hoverOpacity})`:(0,p.Fq)(e.palette[t].main,e.palette.action.hoverOpacity),"--variant-outlinedBorder":(e.vars||e).palette[t].main,"--variant-outlinedBg":e.vars?`rgba(${e.vars.palette[t].mainChannel} / ${e.vars.palette.action.hoverOpacity})`:(0,p.Fq)(e.palette[t].main,e.palette.action.hoverOpacity)}}}}))),{props:{color:"inherit"},style:{color:"inherit",borderColor:"currentColor","--variant-containedBg":e.vars?e.vars.palette.Button.inheritContainedBg:t,"@media (hover: hover)":{"&:hover":{"--variant-containedBg":e.vars?e.vars.palette.Button.inheritContainedHoverBg:o,"--variant-textBg":e.vars?`rgba(${e.vars.palette.text.primaryChannel} / ${e.vars.palette.action.hoverOpacity})`:(0,p.Fq)(e.palette.text.primary,e.palette.action.hoverOpacity),"--variant-outlinedBg":e.vars?`rgba(${e.vars.palette.text.primaryChannel} / ${e.vars.palette.action.hoverOpacity})`:(0,p.Fq)(e.palette.text.primary,e.palette.action.hoverOpacity)}}}},{props:{size:"small",variant:"text"},style:{padding:"4px 5px",fontSize:e.typography.pxToRem(13)}},{props:{size:"large",variant:"text"},style:{padding:"8px 11px",fontSize:e.typography.pxToRem(15)}},{props:{size:"small",variant:"outlined"},style:{padding:"3px 9px",fontSize:e.typography.pxToRem(13)}},{props:{size:"large",variant:"outlined"},style:{padding:"7px 21px",fontSize:e.typography.pxToRem(15)}},{props:{size:"small",variant:"contained"},style:{padding:"4px 10px",fontSize:e.typography.pxToRem(13)}},{props:{size:"large",variant:"contained"},style:{padding:"8px 22px",fontSize:e.typography.pxToRem(15)}},{props:{disableElevation:!0},style:{boxShadow:"none","&:hover":{boxShadow:"none"},[`&.${v.Z.focusVisible}`]:{boxShadow:"none"},"&:active":{boxShadow:"none"},[`&.${v.Z.disabled}`]:{boxShadow:"none"}}},{props:{fullWidth:!0},style:{width:"100%"}}]}}))),w=(0,l.ZP)("span",{name:"MuiButton",slot:"StartIcon",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.startIcon,t[`iconSize${(0,m.Z)(o.size)}`]]}})({display:"inherit",marginRight:8,marginLeft:-4,variants:[{props:{size:"small"},style:{marginLeft:-2}},...b]}),Z=(0,l.ZP)("span",{name:"MuiButton",slot:"EndIcon",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.endIcon,t[`iconSize${(0,m.Z)(o.size)}`]]}})({display:"inherit",marginRight:-4,marginLeft:8,variants:[{props:{size:"small"},style:{marginRight:-2}},...b]});var S=r.forwardRef((function(e,t){const o=r.useContext(g),p=r.useContext(f),s=(0,n.Z)(o,e),l=(0,d.i)({props:s,name:"MuiButton"}),{children:c,color:u="primary",component:h="button",className:b,disabled:S=!1,disableElevation:$=!1,disableFocusRipple:z=!1,endIcon:C,focusVisibleClassName:M,fullWidth:R=!1,size:T="medium",startIcon:I,type:O,variant:P="text",...B}=l,L={...l,color:u,component:h,disabled:S,disableElevation:$,disableFocusRipple:z,fullWidth:R,size:T,type:O,variant:P},k=(e=>{const{color:t,disableElevation:o,fullWidth:r,size:a,variant:n,classes:p}=e,s={root:["root",n,`${n}${(0,m.Z)(t)}`,`size${(0,m.Z)(a)}`,`${n}Size${(0,m.Z)(a)}`,`color${(0,m.Z)(t)}`,o&&"disableElevation",r&&"fullWidth"],label:["label"],startIcon:["icon","startIcon",`iconSize${(0,m.Z)(a)}`],endIcon:["icon","endIcon",`iconSize${(0,m.Z)(a)}`]},l=(0,i.Z)(s,v.F,p);return{...p,...l}})(L),V=I&&(0,y.jsx)(w,{className:k.startIcon,ownerState:L,children:I}),F=C&&(0,y.jsx)(Z,{className:k.endIcon,ownerState:L,children:C}),E=p||"";return(0,y.jsxs)(x,{ownerState:L,className:(0,a.Z)(o.className,k.root,b,E),component:h,disabled:S,focusRipple:!z,focusVisibleClassName:(0,a.Z)(k.focusVisible,M),ref:t,type:O,...B,classes:k,children:[V,c,F]})}))},97933:function(e,t,o){o.d(t,{F:function(){return n}});var r=o(1588),a=o(34867);function n(e){return(0,a.ZP)("MuiButton",e)}const i=(0,r.Z)("MuiButton",["root","text","textInherit","textPrimary","textSecondary","textSuccess","textError","textInfo","textWarning","outlined","outlinedInherit","outlinedPrimary","outlinedSecondary","outlinedSuccess","outlinedError","outlinedInfo","outlinedWarning","contained","containedInherit","containedPrimary","containedSecondary","containedSuccess","containedError","containedInfo","containedWarning","disableElevation","focusVisible","disabled","colorInherit","colorPrimary","colorSecondary","colorSuccess","colorError","colorInfo","colorWarning","textSizeSmall","textSizeMedium","textSizeLarge","outlinedSizeSmall","outlinedSizeMedium","outlinedSizeLarge","containedSizeSmall","containedSizeMedium","containedSizeLarge","sizeMedium","sizeSmall","sizeLarge","fullWidth","startIcon","endIcon","icon","iconSizeSmall","iconSizeMedium","iconSizeLarge"]);t.Z=i},35097:function(e,t,o){o.d(t,{V:function(){return n}});var r=o(1588),a=o(34867);function n(e){return(0,a.ZP)("MuiDivider",e)}const i=(0,r.Z)("MuiDivider",["root","absolute","fullWidth","inset","middle","flexItem","light","vertical","withChildren","withChildrenVertical","textAlignRight","textAlignLeft","wrapper","wrapperVertical"]);t.Z=i},84592:function(e,t,o){o.d(t,{f:function(){return n}});var r=o(1588),a=o(34867);function n(e){return(0,a.ZP)("MuiListItemIcon",e)}const i=(0,r.Z)("MuiListItemIcon",["root","alignItemsFlexStart"]);t.Z=i},26336:function(e,t,o){o.d(t,{L:function(){return n}});var r=o(1588),a=o(34867);function n(e){return(0,a.ZP)("MuiListItemText",e)}const i=(0,r.Z)("MuiListItemText",["root","multiline","dense","inset","primary","secondary"]);t.Z=i},33797:function(e,t,o){o.d(t,{Z:function(){return $}});var r=o(67294),a=o(63961),n=o(94780),i=o(9652),p=o(14136),s=o(90948),l=o(53065),c=o(28628),d=o(59773),u=o(43980),m=o(58974),h=o(51705),v=o(35097),g=o(84592),f=o(26336),y=o(1588),b=o(34867);function x(e){return(0,b.ZP)("MuiMenuItem",e)}var w=(0,y.Z)("MuiMenuItem",["root","focusVisible","dense","disabled","divider","gutters","selected"]),Z=o(85893);const S=(0,s.ZP)(u.Z,{shouldForwardProp:e=>(0,p.Z)(e)||"classes"===e,name:"MuiMenuItem",slot:"Root",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.root,o.dense&&t.dense,o.divider&&t.divider,!o.disableGutters&&t.gutters]}})((0,l.Z)((({theme:e})=>({...e.typography.body1,display:"flex",justifyContent:"flex-start",alignItems:"center",position:"relative",textDecoration:"none",minHeight:48,paddingTop:6,paddingBottom:6,boxSizing:"border-box",whiteSpace:"nowrap","&:hover":{textDecoration:"none",backgroundColor:(e.vars||e).palette.action.hover,"@media (hover: none)":{backgroundColor:"transparent"}},[`&.${w.selected}`]:{backgroundColor:e.vars?`rgba(${e.vars.palette.primary.mainChannel} / ${e.vars.palette.action.selectedOpacity})`:(0,i.Fq)(e.palette.primary.main,e.palette.action.selectedOpacity),[`&.${w.focusVisible}`]:{backgroundColor:e.vars?`rgba(${e.vars.palette.primary.mainChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.focusOpacity}))`:(0,i.Fq)(e.palette.primary.main,e.palette.action.selectedOpacity+e.palette.action.focusOpacity)}},[`&.${w.selected}:hover`]:{backgroundColor:e.vars?`rgba(${e.vars.palette.primary.mainChannel} / calc(${e.vars.palette.action.selectedOpacity} + ${e.vars.palette.action.hoverOpacity}))`:(0,i.Fq)(e.palette.primary.main,e.palette.action.selectedOpacity+e.palette.action.hoverOpacity),"@media (hover: none)":{backgroundColor:e.vars?`rgba(${e.vars.palette.primary.mainChannel} / ${e.vars.palette.action.selectedOpacity})`:(0,i.Fq)(e.palette.primary.main,e.palette.action.selectedOpacity)}},[`&.${w.focusVisible}`]:{backgroundColor:(e.vars||e).palette.action.focus},[`&.${w.disabled}`]:{opacity:(e.vars||e).palette.action.disabledOpacity},[`& + .${v.Z.root}`]:{marginTop:e.spacing(1),marginBottom:e.spacing(1)},[`& + .${v.Z.inset}`]:{marginLeft:52},[`& .${f.Z.root}`]:{marginTop:0,marginBottom:0},[`& .${f.Z.inset}`]:{paddingLeft:36},[`& .${g.Z.root}`]:{minWidth:36},variants:[{props:({ownerState:e})=>!e.disableGutters,style:{paddingLeft:16,paddingRight:16}},{props:({ownerState:e})=>e.divider,style:{borderBottom:`1px solid ${(e.vars||e).palette.divider}`,backgroundClip:"padding-box"}},{props:({ownerState:e})=>!e.dense,style:{[e.breakpoints.up("sm")]:{minHeight:"auto"}}},{props:({ownerState:e})=>e.dense,style:{minHeight:32,paddingTop:4,paddingBottom:4,...e.typography.body2,[`& .${g.Z.root} svg`]:{fontSize:"1.25rem"}}}]}))));var $=r.forwardRef((function(e,t){const o=(0,c.i)({props:e,name:"MuiMenuItem"}),{autoFocus:i=!1,component:p="li",dense:s=!1,divider:l=!1,disableGutters:u=!1,focusVisibleClassName:v,role:g="menuitem",tabIndex:f,className:y,...b}=o,w=r.useContext(d.Z),$=r.useMemo((()=>({dense:s||w.dense||!1,disableGutters:u})),[w.dense,s,u]),z=r.useRef(null);(0,m.Z)((()=>{i&&z.current&&z.current.focus()}),[i]);const C={...o,dense:$.dense,divider:l,disableGutters:u},M=(e=>{const{disabled:t,dense:o,divider:r,disableGutters:a,selected:i,classes:p}=e,s={root:["root",o&&"dense",t&&"disabled",!a&&"gutters",r&&"divider",i&&"selected"]},l=(0,n.Z)(s,x,p);return{...p,...l}})(o),R=(0,h.Z)(z,t);let T;return o.disabled||(T=void 0!==f?f:-1),(0,Z.jsx)(d.Z.Provider,{value:$,children:(0,Z.jsx)(S,{ref:R,role:g,tabIndex:T,component:p,focusVisibleClassName:(0,a.Z)(M.focusVisible,v),className:(0,a.Z)(M.root,y),...b,ownerState:C,classes:M})})}))},52141:function(e,t,o){o.d(t,{Z:function(){return k}});var r=o(67294),a=o(63961),n=o(21056),i=o(94780),p=o(9652),s=o(82056),l=o(64),c=o(57907),d=o(90948),u=o(2734),m=o(53065),h=o(28628),v=o(98216),g=o(96514),f=o(38584),y=o(2068),b=o(51705),x=o(92996).Z,w=o(49299),Z=o(80560),S=o(1588),$=o(34867);function z(e){return(0,$.ZP)("MuiTooltip",e)}var C=(0,S.Z)("MuiTooltip",["popper","popperInteractive","popperArrow","popperClose","tooltip","tooltipArrow","touch","tooltipPlacementLeft","tooltipPlacementRight","tooltipPlacementTop","tooltipPlacementBottom","arrow"]),M=o(85893);const R=(0,d.ZP)(f.Z,{name:"MuiTooltip",slot:"Popper",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.popper,!o.disableInteractive&&t.popperInteractive,o.arrow&&t.popperArrow,!o.open&&t.popperClose]}})((0,m.Z)((({theme:e})=>({zIndex:(e.vars||e).zIndex.tooltip,pointerEvents:"none",variants:[{props:({ownerState:e})=>!e.disableInteractive,style:{pointerEvents:"auto"}},{props:({open:e})=>!e,style:{pointerEvents:"none"}},{props:({ownerState:e})=>e.arrow,style:{[`&[data-popper-placement*="bottom"] .${C.arrow}`]:{top:0,marginTop:"-0.71em","&::before":{transformOrigin:"0 100%"}},[`&[data-popper-placement*="top"] .${C.arrow}`]:{bottom:0,marginBottom:"-0.71em","&::before":{transformOrigin:"100% 0"}},[`&[data-popper-placement*="right"] .${C.arrow}`]:{height:"1em",width:"0.71em","&::before":{transformOrigin:"100% 100%"}},[`&[data-popper-placement*="left"] .${C.arrow}`]:{height:"1em",width:"0.71em","&::before":{transformOrigin:"0 0"}}}},{props:({ownerState:e})=>e.arrow&&!e.isRtl,style:{[`&[data-popper-placement*="right"] .${C.arrow}`]:{left:0,marginLeft:"-0.71em"}}},{props:({ownerState:e})=>e.arrow&&!!e.isRtl,style:{[`&[data-popper-placement*="right"] .${C.arrow}`]:{right:0,marginRight:"-0.71em"}}},{props:({ownerState:e})=>e.arrow&&!e.isRtl,style:{[`&[data-popper-placement*="left"] .${C.arrow}`]:{right:0,marginRight:"-0.71em"}}},{props:({ownerState:e})=>e.arrow&&!!e.isRtl,style:{[`&[data-popper-placement*="left"] .${C.arrow}`]:{left:0,marginLeft:"-0.71em"}}}]})))),T=(0,d.ZP)("div",{name:"MuiTooltip",slot:"Tooltip",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.tooltip,o.touch&&t.touch,o.arrow&&t.tooltipArrow,t[`tooltipPlacement${(0,v.Z)(o.placement.split("-")[0])}`]]}})((0,m.Z)((({theme:e})=>({backgroundColor:e.vars?e.vars.palette.Tooltip.bg:(0,p.Fq)(e.palette.grey[700],.92),borderRadius:(e.vars||e).shape.borderRadius,color:(e.vars||e).palette.common.white,fontFamily:e.typography.fontFamily,padding:"4px 8px",fontSize:e.typography.pxToRem(11),maxWidth:300,margin:2,wordWrap:"break-word",fontWeight:e.typography.fontWeightMedium,[`.${C.popper}[data-popper-placement*="left"] &`]:{transformOrigin:"right center"},[`.${C.popper}[data-popper-placement*="right"] &`]:{transformOrigin:"left center"},[`.${C.popper}[data-popper-placement*="top"] &`]:{transformOrigin:"center bottom",marginBottom:"14px"},[`.${C.popper}[data-popper-placement*="bottom"] &`]:{transformOrigin:"center top",marginTop:"14px"},variants:[{props:({ownerState:e})=>e.arrow,style:{position:"relative",margin:0}},{props:({ownerState:e})=>e.touch,style:{padding:"8px 16px",fontSize:e.typography.pxToRem(14),lineHeight:(16/14,Math.round(114285.71428571428)/1e5+"em"),fontWeight:e.typography.fontWeightRegular}},{props:({ownerState:e})=>!e.isRtl,style:{[`.${C.popper}[data-popper-placement*="left"] &`]:{marginRight:"14px"},[`.${C.popper}[data-popper-placement*="right"] &`]:{marginLeft:"14px"}}},{props:({ownerState:e})=>!e.isRtl&&e.touch,style:{[`.${C.popper}[data-popper-placement*="left"] &`]:{marginRight:"24px"},[`.${C.popper}[data-popper-placement*="right"] &`]:{marginLeft:"24px"}}},{props:({ownerState:e})=>!!e.isRtl,style:{[`.${C.popper}[data-popper-placement*="left"] &`]:{marginLeft:"14px"},[`.${C.popper}[data-popper-placement*="right"] &`]:{marginRight:"14px"}}},{props:({ownerState:e})=>!!e.isRtl&&e.touch,style:{[`.${C.popper}[data-popper-placement*="left"] &`]:{marginLeft:"24px"},[`.${C.popper}[data-popper-placement*="right"] &`]:{marginRight:"24px"}}},{props:({ownerState:e})=>e.touch,style:{[`.${C.popper}[data-popper-placement*="top"] &`]:{marginBottom:"24px"}}},{props:({ownerState:e})=>e.touch,style:{[`.${C.popper}[data-popper-placement*="bottom"] &`]:{marginTop:"24px"}}}]})))),I=(0,d.ZP)("span",{name:"MuiTooltip",slot:"Arrow",overridesResolver:(e,t)=>t.arrow})((0,m.Z)((({theme:e})=>({overflow:"hidden",position:"absolute",width:"1em",height:"0.71em",boxSizing:"border-box",color:e.vars?e.vars.palette.Tooltip.bg:(0,p.Fq)(e.palette.grey[700],.9),"&::before":{content:'""',margin:"auto",display:"block",width:"100%",height:"100%",backgroundColor:"currentColor",transform:"rotate(45deg)"}}))));let O=!1;const P=new n.V;let B={x:0,y:0};function L(e,t){return(o,...r)=>{t&&t(o,...r),e(o,...r)}}var k=r.forwardRef((function(e,t){const o=(0,h.i)({props:e,name:"MuiTooltip"}),{arrow:p=!1,children:d,classes:m,components:S={},componentsProps:$={},describeChild:C=!1,disableFocusListener:k=!1,disableHoverListener:V=!1,disableInteractive:F=!1,disableTouchListener:E=!1,enterDelay:W=100,enterNextDelay:j=0,enterTouchDelay:H=700,followCursor:N=!1,id:A,leaveDelay:q=0,leaveTouchDelay:D=1500,onClose:G,onOpen:U,open:X,placement:Y="bottom",PopperComponent:J,PopperProps:K={},slotProps:Q={},slots:_={},title:ee,TransitionComponent:te,TransitionProps:oe,...re}=o,ae=r.isValidElement(d)?d:(0,M.jsx)("span",{children:d}),ne=(0,u.Z)(),ie=(0,s.V)(),[pe,se]=r.useState(),[le,ce]=r.useState(null),de=r.useRef(!1),ue=F||N,me=(0,n.Z)(),he=(0,n.Z)(),ve=(0,n.Z)(),ge=(0,n.Z)(),[fe,ye]=(0,w.Z)({controlled:X,default:!1,name:"Tooltip",state:"open"});let be=fe;const xe=x(A),we=r.useRef(),Ze=(0,y.Z)((()=>{void 0!==we.current&&(document.body.style.WebkitUserSelect=we.current,we.current=void 0),ge.clear()}));r.useEffect((()=>Ze),[Ze]);const Se=e=>{P.clear(),O=!0,ye(!0),U&&!be&&U(e)},$e=(0,y.Z)((e=>{P.start(800+q,(()=>{O=!1})),ye(!1),G&&be&&G(e),me.start(ne.transitions.duration.shortest,(()=>{de.current=!1}))})),ze=e=>{de.current&&"touchstart"!==e.type||(pe&&pe.removeAttribute("title"),he.clear(),ve.clear(),W||O&&j?he.start(O?j:W,(()=>{Se(e)})):Se(e))},Ce=e=>{he.clear(),ve.start(q,(()=>{$e(e)}))},[,Me]=r.useState(!1),Re=e=>{(0,l.Z)(e.target)||(Me(!1),Ce(e))},Te=e=>{pe||se(e.currentTarget),(0,l.Z)(e.target)&&(Me(!0),ze(e))},Ie=e=>{de.current=!0;const t=ae.props;t.onTouchStart&&t.onTouchStart(e)};r.useEffect((()=>{if(be)return document.addEventListener("keydown",e),()=>{document.removeEventListener("keydown",e)};function e(e){"Escape"===e.key&&$e(e)}}),[$e,be]);const Oe=(0,b.Z)((0,c.Z)(ae),se,t);ee||0===ee||(be=!1);const Pe=r.useRef(),Be={},Le="string"==typeof ee;C?(Be.title=be||!Le||V?null:ee,Be["aria-describedby"]=be?xe:null):(Be["aria-label"]=Le?ee:null,Be["aria-labelledby"]=be&&!Le?xe:null);const ke={...Be,...re,...ae.props,className:(0,a.Z)(re.className,ae.props.className),onTouchStart:Ie,ref:Oe,...N?{onMouseMove:e=>{const t=ae.props;t.onMouseMove&&t.onMouseMove(e),B={x:e.clientX,y:e.clientY},Pe.current&&Pe.current.update()}}:{}},Ve={};E||(ke.onTouchStart=e=>{Ie(e),ve.clear(),me.clear(),Ze(),we.current=document.body.style.WebkitUserSelect,document.body.style.WebkitUserSelect="none",ge.start(H,(()=>{document.body.style.WebkitUserSelect=we.current,ze(e)}))},ke.onTouchEnd=e=>{ae.props.onTouchEnd&&ae.props.onTouchEnd(e),Ze(),ve.start(D,(()=>{$e(e)}))}),V||(ke.onMouseOver=L(ze,ke.onMouseOver),ke.onMouseLeave=L(Ce,ke.onMouseLeave),ue||(Ve.onMouseOver=ze,Ve.onMouseLeave=Ce)),k||(ke.onFocus=L(Te,ke.onFocus),ke.onBlur=L(Re,ke.onBlur),ue||(Ve.onFocus=Te,Ve.onBlur=Re));const Fe={...o,isRtl:ie,arrow:p,disableInteractive:ue,placement:Y,PopperComponentProp:J,touch:de.current},Ee="function"==typeof Q.popper?Q.popper(Fe):Q.popper,We=r.useMemo((()=>{let e=[{name:"arrow",enabled:Boolean(le),options:{element:le,padding:4}}];return K.popperOptions?.modifiers&&(e=e.concat(K.popperOptions.modifiers)),Ee?.popperOptions?.modifiers&&(e=e.concat(Ee.popperOptions.modifiers)),{...K.popperOptions,...Ee?.popperOptions,modifiers:e}}),[le,K.popperOptions,Ee?.popperOptions]),je=(e=>{const{classes:t,disableInteractive:o,arrow:r,touch:a,placement:n}=e,p={popper:["popper",!o&&"popperInteractive",r&&"popperArrow"],tooltip:["tooltip",r&&"tooltipArrow",a&&"touch",`tooltipPlacement${(0,v.Z)(n.split("-")[0])}`],arrow:["arrow"]};return(0,i.Z)(p,z,t)})(Fe),He="function"==typeof Q.transition?Q.transition(Fe):Q.transition,Ne={slots:{popper:S.Popper,transition:S.Transition??te,tooltip:S.Tooltip,arrow:S.Arrow,..._},slotProps:{arrow:Q.arrow??$.arrow,popper:{...K,...Ee??$.popper},tooltip:Q.tooltip??$.tooltip,transition:{...oe,...He??$.transition}}},[Ae,qe]=(0,Z.Z)("popper",{elementType:R,externalForwardedProps:Ne,ownerState:Fe,className:(0,a.Z)(je.popper,K?.className)}),[De,Ge]=(0,Z.Z)("transition",{elementType:g.Z,externalForwardedProps:Ne,ownerState:Fe}),[Ue,Xe]=(0,Z.Z)("tooltip",{elementType:T,className:je.tooltip,externalForwardedProps:Ne,ownerState:Fe}),[Ye,Je]=(0,Z.Z)("arrow",{elementType:I,className:je.arrow,externalForwardedProps:Ne,ownerState:Fe,ref:ce});return(0,M.jsxs)(r.Fragment,{children:[r.cloneElement(ae,ke),(0,M.jsx)(Ae,{as:J??f.Z,placement:Y,anchorEl:N?{getBoundingClientRect:()=>({top:B.y,left:B.x,right:B.x,bottom:B.y,width:0,height:0})}:pe,popperRef:Pe,open:!!pe&&be,id:xe,transition:!0,...Ve,...qe,popperOptions:We,children:({TransitionProps:e})=>(0,M.jsx)(De,{timeout:ne.transitions.duration.shorter,...e,...Ge,children:(0,M.jsxs)(Ue,{...Xe,children:[ee,p?(0,M.jsx)(Ye,{...Je}):null]})})})]})}))}}]);