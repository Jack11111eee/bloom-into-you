/**
 * index-new.js — 全局运动运行时（P3 交付物）
 *
 * 这是 `reference/js/index-new.js`（1415 行）的**忠实移植**，不是重写：
 * 函数划分、调用顺序、GSAP 调用签名（含 GSAP 2 遗留的 `gsap.to(target, dur, vars)` 三参形式）、
 * jQuery 事件绑定、选择器字符串一律照抄。理由见 `PLAN.md` §1「技术路线 A 忠实移植」——
 * 运动系统的保真度取决于这些细节，任何"等价改写"都会引入无法归因的差异。
 *
 * ## 与 `reference/js/index-new.js` 的差异 —— 全部来自登记册，无一处是即兴发挥
 *
 * | 标记 | 差异 | 登记处 |
 * |---|---|---|
 * | `[A2]` | `.span-lines.animate .span-line-inner` 全局选择器 → 限定在当前 `triggerElement` 内 | `DEVIATIONS.md` A2 |
 * | `[B1]` | 删除箭头函数内失效的 `$(this.parentNode).removeClass('not-active')` | `DEVIATIONS.md` B1 |
 * | `[B2]` | 守卫选择器拼写 `.mouse-post-list-span` → `.mouse-pos-list-span` | `DEVIATIONS.md` B2 |
 * | `[B3]` | `if($(".float-image-wrap"))` 恒真 → 改为 `.length` 判断 | `DEVIATIONS.md` B3 |
 * | `[B4]` | `initScrollLetters` 内的 `const scroll` 遮蔽全局 → 改名 `dirTrigger` | `DEVIATIONS.md` B4 |
 * | `[B5]` | 删除死变量 `var strength = 100` | `DEVIATIONS.md` B5 |
 * | `[B6]` | ~~`clearProps: "true"`（字符串）→ 布尔 `true`~~ **已 REVERTED** —— 实测字符串是**空操作**，统一会改变行为 | `DEVIATIONS.md` B6 |
 * | `[B7]` | 新增 `prefers-reduced-motion` 分支（惯性 / 页面转场 / 视差 / **首屏 loader** 四项），默认路径不变 | `DEVIATIONS.md` B7 |
 *
 * **刻意未做的改动**（做了即为未登记的行为偏离）：
 *   · `[N3]` `initLoader()` **不**加 `scroll.stop()/start()` —— 原站如此，照抄。
 *   · `[N1]` `window.onresize = scroll.update();` 照抄（Locomotive 自带 `checkResize`，它无害）。
 *   · `[N2]` `pageTransitionIn` 里 `>540` / `≤540` 两个分支值相同，照抄。
 *   · `[B7]` 菜单/悬停的 **CSS 过渡**不在 B7 的登记范围内，故 reduced 下仍全速播放。
 *     这是**已知缺口**（`ISSUES.md` ISSUE-031）：P8 时用户裁决**只扩大 loader**、
 *     CSS 过渡不做，**不要顺手补**。
 *     （首屏 loader 已于 P8 纳入 B7 —— 见 `initLoaderHome` / `initLoader` 末尾的 `[B7]`。）
 *
 * ## 三处必须记住的运行时事实（都经实测，见 `LEDGER.md` / `HANDOFF.md`）
 *
 * 1. **首屏只初始化一次。** Barba 2.10.3 的 `once` 流程是
 *    `ready → beforeEnter(全局) → beforeOnce → once → afterOnce → afterEnter(全局)`；
 *    transition 级的 `beforeEnter`（调用 `initScript()` 的那个）只由 `doPage()` 触发，
 *    首屏不走 `doPage()`。故 `initSmoothScroll` 与 `initScript()` 各执行一次
 *    （`[实测]` 17/17 路由 `locoCount = 1`、`initScriptCount = 1`）。**按执行一次来写。**
 * 2. **`to-home` 只定义 `once`。** 它没有 `leave`/`enter`，所以客户端跳转进首页时
 *    Barba 回落到 `default`，**擦除动画照常播放**（`SPEC.md` §0 C2 的实测结论）。
 * 3. **`let scroll` 是经典脚本的顶层 `let`**，落在全局**词法**环境而非 `window` 上。
 *    调试时 `window.scroll` 读到的是浏览器内置的 `scroll()` 方法 —— 一个很容易踩的坑
 *    （`scripts/harness/probe-p3-loader.mjs` 的第一版就因此静默读到 `null`）。
 */

gsap.registerPlugin(ScrollTrigger);

let scroll;

const body = document.body;
const select = (e) => document.querySelector(e);
const selectAll = (e) => document.querySelectorAll(e);

/**
 * [B7] `prefers-reduced-motion` —— **新增能力**，**原站完全没有**
 * （`[实测]` 5 个 CSS 中 `prefers-` 出现 0 次、`index-new.js` 无 reduced 分支）。
 * 故它不受"忠实复刻"约束，但**不得改变默认（非 reduced）路径的任何行为**。
 *
 * 本文件只做 B7 登记的四项，且每处都带 `[B7]` 标记：
 *   1. **去除平滑惯性** —— `initSmoothScroll` 的 `inertia: 10`（`lerp = 1`）
 *   2. **缩短/取消页面转场** —— `pageTransitionIn` / `pageTransitionOut` 的 `progress(1)`
 *      ＋ `leave` 里那段 `delay(495)`
 *   3. **关闭大幅视差** —— `initSmoothScroll` 里摘掉 `data-scroll-speed`
 *   4. **首屏 loader 走完时间线**（2026-09-26，P8 扩大范围）—— `initLoaderHome` /
 *      `initLoader` 末尾的 `progress(1)`
 *
 * **刻意未覆盖**：菜单/悬停的 **CSS 过渡**不在 B7 登记范围内，故保持原样。
 * 这是一处**已知缺口**（`ISSUES.md` ISSUE-031）：P8 时用户裁决只扩大 loader，
 * **CSS 过渡不做**。**不要顺手补** —— 那要一条 `@media (prefers-reduced-motion: reduce)`
 * 兜底去改多个组件的时长，改动面比上面四项加起来还宽。
 *
 * 读一次即固定（与 `--vh` 一致：原站也没有 `matchMedia` 的 change 监听）。
 */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initPageTransitions();

// Animation - First Page Load
function initLoaderHome() {

  var tl = gsap.timeline();

	tl.set(".loading-screen", {
		top: "0",
	});

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh"
    });
  } else {
    tl.set("main .once-in", {
      y: "10vh"
    });
  }

  tl.set(".loading-words", {
		opacity: 0,
    y: -50
	});

  tl.set(".loading-words .active", {
		display: "none",
	});

  tl.set(".loading-words .home-active, .loading-words .home-active-last", {
		display: "block",
    opacity: 0
	});

  tl.set(".loading-words .home-active-first", {
		opacity: 1,
	});

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

  tl.set("html", {
		cursor: "wait"
	});

  tl.call(function() {
    scroll.stop();
  });

  tl.to(".loading-words", {
		duration: .8,
		opacity: 1,
    y: -50,
    ease: "Power4.easeOut",
    delay: .5
	});

  tl.to(".loading-words .home-active", {
		duration: .01,
		opacity: 1,
    stagger: .15,
    ease: "none",
    onStart: homeActive
  },"=-.4");

  function homeActive() {
    gsap.to(".loading-words .home-active", {
      duration: .01,
      opacity: 0,
      stagger: .15,
      ease: "none",
      delay: .15
    });
  }

  tl.to(".loading-words .home-active-last", {
		duration: .01,
		opacity: 1,
    delay: .15
  });

	tl.to(".loading-screen", {
		duration: .8,
		top: "-100%",
		ease: "Power4.easeInOut",
    delay: .2
  });

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
		duration: 1,
		height: "0vh",
		ease: "Power4.easeInOut"
	},"=-.8");

  tl.to(".loading-words", {
		duration: .3,
		opacity: 0,
    ease: "linear"
	},"=-.8");

	tl.set(".loading-screen", {
		top: "calc(-100%)"
	});

  tl.set(".loading-screen .rounded-div-wrap.bottom", {
		height: "0vh"
	});

  tl.to("main .once-in", {
		duration: 1.5,
    y: "0vh",
    stagger: .07,
		ease: "Expo.easeOut",
    clearProps: true            // 原站此处就是布尔 true（会真的清除）—— 与下面两处的字符串 "true" 行为不同，见 [B6]
	},"=-.8");

  tl.set("html", {
		cursor: "auto"
	},"=-1.2");

  tl.call(function() {
    scroll.start();
  });

  // [B7] reduced-motion（2026-09-26，P8 扩大范围）：让 loader 时间线**走完**而不是"跳过"。
  // 与 `pageTransitionIn` / `pageTransitionOut` 同一手法 —— `progress(1)` 正向渲染过整条
  // 时间线 ⇒ 里面的 `tl.call(scroll.stop/start)`、`tl.set("html", {cursor})` 等**状态性
  // 副作用照常生效**，只是没有可见运动（reduced 下页面仍然可用、仍可滚）。
  // **"快"不等于"取消"** —— 这一条必须实测（见 `scripts/harness/probe-p6-reduced.mjs`）。
  if (prefersReducedMotion) tl.progress(1);
}

// Animation - First Page Load
// [N3] 原站此函数**没有** scroll.stop()/scroll.start() —— 非首页首屏期间滚动未被锁。
// 照抄，不擅自加锁。`LEDGER.md` Q2 的实测结论见本文件末尾的注释。
function initLoader() {

  var tl = gsap.timeline();

	tl.set(".loading-screen", {
		top: "0",
	});

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh"
    });
  } else {
    tl.set("main .once-in", {
      y: "10vh"
    });
  }

  tl.set(".loading-words", {
		opacity: 1,
    y: -50
	});

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

  tl.set("html", {
		cursor: "wait"
	});

	tl.to(".loading-screen", {
		duration: .8,
		top: "-100%",
		ease: "Power4.easeInOut",
    delay: .5
  });

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
		duration: 1,
		height: "0vh",
		ease: "Power4.easeInOut"
	},"=-.8");

  tl.to(".loading-words", {
		duration: .3,
		opacity: 0,
    ease: "linear",
	},"=-.8");

	tl.set(".loading-screen", {
		top: "calc(-100%)"
	});

  tl.set(".loading-screen .rounded-div-wrap.bottom", {
		height: "0vh"
	});

  tl.to("main .once-in", {
		duration: 1,
    y: "0vh",
    stagger: .05,
		ease: "Expo.easeOut",
    // ★ 这里是**字符串** `"true"`，原站如此，**照抄**（`DEVIATIONS.md` B6 已 REVERTED）。
    // 实测（2026-09-24，P3）：GSAP 3.9.1 把字符串按逗号切成**属性名列表**，
    // 于是它去找一个叫 "true" 的 CSS 属性 —— 找不到，**clearProps 成为空操作**，
    // 元素会**永久保留**内联 `transform: translate(0px, 0vh)`。
    // 本文件上方 `initLoaderHome` 用的是布尔 `true`，那个**会**清除 ——
    // 同一份原站代码里两种写法行为不同，这就是实测到的差异来源。
    clearProps: "true"
	},"=-.8");

  tl.set("html", {
		cursor: "auto",
	},"=-.8");

  // [B7] reduced-motion（2026-09-26，P8 扩大范围）：让 loader 时间线**走完**而不是"跳过"。
  // 与 `pageTransitionIn` / `pageTransitionOut` 同一手法 —— `progress(1)` 正向渲染过整条
  // 时间线 ⇒ 里面的 `tl.call(scroll.stop/start)`、`tl.set("html", {cursor})` 等**状态性
  // 副作用照常生效**，只是没有可见运动（reduced 下页面仍然可用、仍可滚）。
  // **"快"不等于"取消"** —— 这一条必须实测（见 `scripts/harness/probe-p6-reduced.mjs`）。
  if (prefersReducedMotion) tl.progress(1);
}


// Animation - Page transition In
function pageTransitionIn() {
	var tl = gsap.timeline();

  tl.call(function() {
    scroll.stop();
  });

  tl.set(".loading-screen", {
		top: "100%"
	});

  tl.set(".loading-words", {
		opacity: 0,
    y: 0
	});

  tl.set("html", {
		cursor: "wait"
	});

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh",
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh",
    });
  }

	tl.to(".loading-screen", {
		duration: .5,
		top: "0%",
		ease: "Power4.easeIn"
	});

  // [N2] 原站这两个分支的内容**完全相同**（都是 height: "10vh"）。冗余但无行为差异，照抄。
  if ($(window).width() > 540) {
    tl.to(".loading-screen .rounded-div-wrap.top", {
      duration: .4,
      height: "10vh",
      ease: "Power4.easeIn"
    },"=-.5");
  } else {
    tl.to(".loading-screen .rounded-div-wrap.top", {
      duration: .4,
      height: "10vh",
      ease: "Power4.easeIn"
    },"=-.5");
  }

  tl.to(".loading-words", {
		duration: .8,
		opacity: 1,
    y: -50,
    ease: "Power4.easeOut",
    delay: .05
	});

  tl.set(".loading-screen .rounded-div-wrap.top", {
		height: "0vh"
	});

	tl.to(".loading-screen", {
		duration: .8,
		top: "-100%",
		ease: "Power3.easeInOut"
	},"=-.2");

  tl.to(".loading-words", {
		duration: .6,
		opacity: 0,
    ease: "linear"
	},"=-.8");

  tl.to(".loading-screen .rounded-div-wrap.bottom", {
		duration: .85,
		height: "0",
		ease: "Power3.easeInOut"
	},"=-.6");

  tl.set("html", {
		cursor: "auto"
	},"=-0.6");

  if ($(window).width() > 540) {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "10vh"
    });
  } else {
    tl.set(".loading-screen .rounded-div-wrap.bottom", {
      height: "5vh"
    });
  }

  tl.set(".loading-screen", {
		top: "100%"
	});

  tl.set(".loading-words", {
		opacity: 0,
	});

  // [B7] reduced-motion：把这条 2.2s 的转场**取消**成瞬时。
  // `progress(1)` 正向渲染过整条时间线 ⇒ 全部 `tl.set` 与 `tl.call(scroll.stop)`
  // 照常生效（"保留必要的状态变化"），只是不再有可见运动。
  if (prefersReducedMotion) tl.progress(1);

}


// Animation - Page transition Out
function pageTransitionOut() {
	var tl = gsap.timeline();

  if ($(window).width() > 540) {
    tl.set("main .once-in", {
      y: "50vh",
    });
  } else {
    tl.set("main .once-in", {
      y: "20vh",
    });
  }

  tl.call(function() {
    scroll.start();
  });

  tl.to("main .once-in", {
    duration: 1,
    y: "0vh",
    stagger: .05,
    ease: "Expo.easeOut",
    delay: .8,
    // ★ 同 `initLoader`：原站此处是**字符串** `"true"`（空操作），照抄。
    clearProps: "true"
  });

  // [B7] 同 `pageTransitionIn`：`progress(1)` 会走到 `y: "0vh"` 的终点并触发
  // `tl.call(scroll.start)`，终点状态与正常播完**逐位相同**。
  if (prefersReducedMotion) tl.progress(1);

}

function initPageTransitions() {

  // do something before the transition starts
  barba.hooks.before(() => {
    select('html').classList.add('is-transitioning');
  });

  // do something after the transition finishes
  barba.hooks.after(() => {
    select('html').classList.remove('is-transitioning');
    // reinit locomotive scroll
    scroll.init();
    scroll.stop();
  });

  // scroll to the top of the page
  barba.hooks.enter(() => {
    scroll.destroy();
  });

  // scroll to the top of the page
  barba.hooks.afterEnter(() => {
    window.scrollTo(0, 0);
    initCookieViews();
  });

  if ($(window).width() > 540) {
    barba.hooks.leave(() => {
      $(".btn-hamburger, .btn-menu").removeClass('active');
      $("main").removeClass('nav-active');
    });
  }


  barba.init({
    sync: true,
    debug: false,
    timeout:7000,
    transitions: [{
      name: 'default',
      once(data) {
        // do something once on the initial page load
        initSmoothScroll(data.next.container);
        initScript();
        initCookieViews();
        initLoader();
      },
      async leave(data) {
        // animate loading screen in
        pageTransitionIn(data.current);
        // [B7] reduced-motion：这段等待的唯一目的是"让擦除动画播出来"
        // （§5.7 实测：`leave` 只 `await delay(495)`，而 `pageTransitionIn` 长 2.2s
        //  ⇒ 可见转场 ≈ 495ms + `pageTransitionOut` ≈ 2.4s）。转场已被 `progress(1)`
        // 取消，这段等待就没有对象了。**默认路径的 495ms 不动。**
        //
        // ⚠️ **不能写成 `delay(prefersReducedMotion ? 0 : 495)`**：`delay()` 的第一行是
        // `n = n || 2000`，**传 0 会被换成 2000ms** —— 实测那样写转场反而由 623ms
        // 变成 **2052ms**（`probe-p6-reduced.mjs` 的第一版就踩了这个：`0 || 2000`）。
        // 故这里用条件跳过，而不是传一个"看起来是 0"的值。
        if (!prefersReducedMotion) await delay(495);
        data.current.container.remove();
      },
      async enter(data) {
        // animate loading screen away
        pageTransitionOut(data.next);
        initNextWord(data);
      },
      async beforeEnter(data) {
        ScrollTrigger.getAll().forEach(t => t.kill());
        scroll.destroy();
        initSmoothScroll(data.next.container);
        initScript();
      },
    },
    {
      name: 'to-home',
      from: {
      },
      to: {
        namespace: ['home']
      },
      once(data) {
        // do something once on the initial page load
        initSmoothScroll(data.next.container);
        initScript();
        initCookieViews();
        initLoaderHome();
      },
    }]
  });

  function initSmoothScroll(container) {

    // [B7] reduced-motion：关闭大幅视差。
    // 视差由 Locomotive 在 init 时读 `data-scroll-speed` 建立（`addElements` → `el.speed`
    // → `transformElements`），故**在构造之前**摘掉属性即可，且这是唯一的作用点 ——
    // `data-scroll-speed` 在 `index-new.js` 与全部 CSS 里都不出现（实测 grep 无命中）。
    // 放在本函数而不是 Barba hook 里，是因为**每次客户端跳转都会调用它**（`once` /
    // `beforeEnter`），Barba 注入的新 DOM 因此同样被覆盖。
    if (prefersReducedMotion) {
      container.querySelectorAll('[data-scroll-speed]').forEach((el) => el.removeAttribute('data-scroll-speed'));
    }

    scroll = new LocomotiveScroll({
      el: container.querySelector('[data-scroll-container]'),
      smooth: true,
      // [B7] reduced-motion：去除平滑惯性。
      //
      // `inertia` 在 `locomotive-scroll.min.js` 里**只被用在一处** ——
      // `(e = s.call(this, i)).inertia && (e.lerp = .1 * e.inertia)`（全文 grep 仅此一次），
      // 故 `inertia: 10` 的唯一效果就是 `lerp = 1`。
      //
      // `[实测]` 2026-09-26 / Chromium 153 / 1440×900（`probe-p6-inertia.mjs`）：
      // `scrollTo(600, {duration:0})` 的收敛 —— 默认 `lerp = .1` 是 **497ms / 32 帧**，
      // `inertia: 10`（`lerp = 1`）是 **12ms / 2 帧**；同时 `has-scroll-smooth`、
      // `main: fixed`、`limit.y = 2747`、`[data-scroll-section]` 的 `matrix3d` 位移
      // **全部不变** ⇒ 只去掉缓动，不动引擎。
      //
      // **不用 `smooth: false`**：那会让 Locomotive 换成 Native 类，而
      // `main { position: fixed }` 在 >1024px 是**无条件**的（`style-new.css` L7），
      // 放开它的只有 `@media (max-width:1024px)` 与 `main.touch` 两条路 ——
      // 桌面上关掉 smooth 会得到一个"固定容器 + 原生滚动"的死页面。
      inertia: prefersReducedMotion ? 10 : undefined,
    });

    // [N1] 赋值的是 `scroll.update()` 的返回值（undefined），故为 no-op。
    // 照抄：Locomotive 自带 addEventListener("resize", this.checkResize)，
    // resize 是**工作**的（`[实测]` 1440→1200 后 limit.y 2747→2643）。
    // 不要把它当 bug 记入文档或加入排查方向 —— 那会把人引向错误方向。
    window.onresize = scroll.update();

    scroll.on("scroll", () => ScrollTrigger.update());

    ScrollTrigger.scrollerProxy('[data-scroll-container]', {
      scrollTop(value) {
        return arguments.length ? scroll.scrollTo(value, 0, 0) : scroll.scroll.instance.scroll.y;
      }, // we don't have to define a scrollLeft because we're only scrolling vertically.
      getBoundingClientRect() {
        return {top: 0, left: 0, width: window.innerWidth, height: window.innerHeight};
      },
      // LocomotiveScroll handles things completely differently on mobile devices - it doesn't even transform the container at all! So to get the correct behavior and avoid jitters, we should pin things with position: fixed on mobile. We sense it by checking to see if there's a transform applied to the container (the LocomotiveScroll-controlled element).
      pinType: container.querySelector('[data-scroll-container]').style.transform ? "transform" : "fixed"
    });

    ScrollTrigger.defaults({
      scroller: document.querySelector('[data-scroll-container]'),
    });

    /**
     * Remove Old Locomotive Scrollbar
     */

    const scrollbar = selectAll('.c-scrollbar');

    if(scrollbar.length > 1) {
      scrollbar[0].remove();
    }

    // each time the window updates, we should refresh ScrollTrigger and then update LocomotiveScroll.
    ScrollTrigger.addEventListener('refresh', () => scroll.update());

    // after everything is set up, refresh() ScrollTrigger and update LocomotiveScroll because padding may have been added for pinning, etc.
    ScrollTrigger.refresh();
  }
}

function initNextWord(data) {
  // update Text Loading https://github.com/barbajs/barba/issues/507
  let parser = new DOMParser();
  let dom = parser.parseFromString(data.next.html, 'text/html');
  let nextProjects = dom.querySelector('.loading-words');
  document.querySelector('.loading-words').innerHTML = nextProjects.innerHTML;
}

function delay(n) {
	n = n || 2000;
	return new Promise((done) => {
		setTimeout(() => {
			done();
		}, n);
	});
}


/**
 * Fire all scripts on page load
 *
 * 顺序即语义（`SPEC.md` §5.1）：它决定了 ScrollTrigger 的注册次序，
 * 因而决定了 `ScrollTrigger.getAll()` 的索引 —— 而索引是 P3/P4 验收的比对对象。
 * **不要重排。**
 */
function initScript() {
  select('body').classList.remove('is-loading');
  initWindowInnerheight();
  initCheckTouchDevice();
  initHamburgerNav();
  initMagneticButtons();
  initStickyCursorWithDelay();
  initVisualFilter();
  initScrolltriggerNav();
  initScrollLetters();
  initTricksWords();
  initContactForm();
  initTimeZone();
  initLazyLoad();
  initPlayVideoInview();
  initScrolltriggerAnimations();
}

/**
* Window Inner Height Check
*/
function initWindowInnerheight() {

  // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
  $(document).ready(function(){
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    $('.btn-hamburger').click(function(){
      let vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    });
  });

}

/**
* Check touch device
*/
function initCheckTouchDevice() {

  function isTouchScreendevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints;
  };

  if(isTouchScreendevice()){
    $('main').addClass('touch');
    $('main').removeClass('no-touch');
  } else {
    $('main').removeClass('touch');
    $('main').addClass('no-touch');
  }
  $(window).resize(function() {
    if(isTouchScreendevice()){
       $('main').addClass('touch');
       $('main').removeClass('no-touch');
    } else {
       $('main').removeClass('touch');
       $('main').addClass('no-touch');
    }
  });

}

/**
* Hamburger Nav Open/Close
*
* 只有类名切换与滚动锁 —— **没有任何 GSAP 时间线**，菜单动画全部由 CSS 驱动
* （`SPEC.md` §5.6：`.8s cubic-bezier(.7,0,.2,1)`）。
*/
function initHamburgerNav() {

  // Open/close navigation when clicked .btn-hamburger

  $(document).ready(function(){
    $(".btn-hamburger, .btn-menu").click(function(){
      if ($(".btn-hamburger, .btn-menu").hasClass('active')) {
          $(".btn-hamburger, .btn-menu").removeClass('active');
          $("main").removeClass('nav-active');
          scroll.start();
      } else {
          $(".btn-hamburger, .btn-menu").addClass('active');
          $("main").addClass('nav-active');
          scroll.stop();
      }
    });
    $('.fixed-nav-back').click(function(){
      $(".btn-hamburger, .btn-menu").removeClass('active');
      $("main").removeClass('nav-active');
      scroll.start();
    });
  });
  $(document).keydown(function(e){
    if(e.keyCode == 27) {
      if ($('main').hasClass('nav-active')) {
          $(".btn-hamburger, .btn-menu").removeClass('active');
          $("main").removeClass('nav-active');
          scroll.start();
      }
    }
  });

}

/**
* Magnetic Buttons
*
* 启用条件 `window.innerWidth > 540`。位移 = 归一化指针位置 ∈[-0.5,+0.5] × 元素属性值，
* **没有阻尼** —— 靠 `duration 1.5` + `Power4.easeOut` 产生迟滞感。
* mouseleave 复位用 `Elastic.easeOut`（弹性回弹），且**不含 rotate**。
* 全部经 P3 实测（见 `LEDGER.md` §3 的 P3 段落）。
*/
function initMagneticButtons() {

  // Magnetic Buttons
  // Found via: https://codepen.io/tdesero/pen/RmoxQg
  var magnets = document.querySelectorAll('.magnetic');
  // [B5] 原站此处有 `var strength = 100;` —— 声明后从未使用（实际强度来自
  // 元素的 data-strength / data-strength-text）。删除，以免读者误以为强度是全局固定值。

  // START : If screen is bigger as 540 px do magnetic
  if(window.innerWidth > 540){
  // Mouse Reset
  magnets.forEach( (magnet) => {
    magnet.addEventListener('mousemove', moveMagnet );
    // [B1] 原站此处有 `$(this.parentNode).removeClass('not-active');` —— 箭头函数没有自己的
    // `this`，`this` 为 window，`window.parentNode` 为 undefined → no-op。删除该行；
    // 同一逻辑在下面的 mouseenter / mouseleave 回调里（jQuery 回调，`this` 正确）已实现。
    magnet.addEventListener('mouseleave', function(event) {
        gsap.to( event.currentTarget, 1.5, {
          x: 0,
          y: 0,
          ease: Elastic.easeOut
        });
        gsap.to( $(this).find(".btn-text"), 1.5, {
          x: 0,
          y: 0,
          ease: Elastic.easeOut
        });
    });
  });

  // Mouse move
  function moveMagnet(event) {
    var magnetButton = event.currentTarget;
    var bounding = magnetButton.getBoundingClientRect();
    var magnetsStrength = magnetButton.getAttribute("data-strength");
    var magnetsStrengthText = magnetButton.getAttribute("data-strength-text");

    gsap.to( magnetButton, 1.5, {
        x: ((( event.clientX - bounding.left)/magnetButton.offsetWidth) - 0.5) * magnetsStrength,
        y: ((( event.clientY - bounding.top)/magnetButton.offsetHeight) - 0.5) * magnetsStrength,
        rotate: "0.001deg",
        ease: Power4.easeOut
    });
    gsap.to( $(this).find(".btn-text"), 1.5, {
        x: ((( event.clientX - bounding.left)/magnetButton.offsetWidth) - 0.5) * magnetsStrengthText,
        y: ((( event.clientY - bounding.top)/magnetButton.offsetHeight) - 0.5) * magnetsStrengthText,
        rotate: "0.001deg",
        ease: Power4.easeOut
    });
  }

  }; // END : If screen is bigger as 540 px do magnetic

  // Mouse Enter
  $('.btn-click.magnetic').on('mouseenter', function() {
    if($(this).find(".btn-fill").length) {
    gsap.to($(this).find(".btn-fill"), .6, {
        startAt: {y: "76%"},
        y: "0%",
        ease: Power2.easeInOut
    });
    }
    if($(this).find(".btn-text-inner.change").length) {
    gsap.to($(this).find(".btn-text-inner.change"), .3, {
        startAt: {color: "#1C1D20"},
        color: "#FFFFFF",
        ease: Power3.easeIn,
    });
    }
    $(this.parentNode).removeClass('not-active');
  });

  // Mouse Leave
  $('.btn-click.magnetic').on('mouseleave', function() {
    if($(this).find(".btn-fill").length) {
    gsap.to($(this).find(".btn-fill"), .6, {
        y: "-76%",
        ease: Power2.easeInOut
    });
    }
    if($(this).find(".btn-text-inner.change").length) {
    gsap.to($(this).find(".btn-text-inner.change"), .3, {
        color: "#1C1D20",
        ease: Power3.easeOut,
        delay: .3
    });
    }
    $(this.parentNode).removeClass('not-active');
  });
}


/**
* Sticky Cursor with Delay
*
* 三层跟随除数不同：`.mouse-pos-list-image` 12（最慢）、`-btn` 7、`-span` 6（最快）。
* 驱动是一个**空对象 tween**：`gsap.to({}, 0.0083333333, {repeat:-1, onRepeat})`，
* 即 duration 1/120s ≈ 8.333ms，每次 repeat 插值一次 `posX += (mouseX - posX) / N`。
* 输入是 `e.clientX/clientY`（视口坐标），故这三个元素必须是 `position: fixed`。
* 起始值均为 0，首帧会从 (0,0) 追到指针 —— 原站如此，照抄。
*/
function initStickyCursorWithDelay() {

  // Sticky Cursor with delay
  // https://greensock.com/forums/topic/21161-animated-mouse-cursor/
  var cursorImage = $(".mouse-pos-list-image")
  var cursorBtn = $(".mouse-pos-list-btn");
  var cursorSpan = $(".mouse-pos-list-span");

  var posXImage = 0
  var posYImage = 0
  var posXBtn = 0
  var posYBtn = 0
  var posXSpan = 0
  var posYSpan = 0
  var mouseX = 0
  var mouseY = 0

  // [B2] 原站守卫的第三个选择器拼写为 `.mouse-post-list-span`（应为 `mouse-pos-`）。
  // 当前无影响（前两个选择器已命中），但一旦某页只有 span 层就会失效。修正拼写。
  if(document.querySelector(".mouse-pos-list-image, .mouse-pos-list-btn, .mouse-pos-list-span")) {
  gsap.to({}, 0.0083333333, {
    repeat: -1,
    onRepeat: function() {

      if(document.querySelector(".mouse-pos-list-image")) {
        posXImage += (mouseX - posXImage) / 12;
        posYImage += (mouseY - posYImage) / 12;
        gsap.set(cursorImage, {
          css: {
          left: posXImage,
          top: posYImage
          }
        });
      }
      if(document.querySelector(".mouse-pos-list-btn")) {
        posXBtn += (mouseX - posXBtn) / 7;
        posYBtn += (mouseY - posYBtn) / 7;
        gsap.set(cursorBtn, {
          css: {
          left: posXBtn,
          top: posYBtn
          }
        });
      }
      if(document.querySelector(".mouse-pos-list-span")) {
        posXSpan += (mouseX - posXSpan) / 6;
        posYSpan += (mouseY - posYSpan) / 6;
        gsap.set(cursorSpan, {
          css: {
          left: posXSpan,
          top: posYSpan
          }
        });
      }
    }
  });
  }

  $(document).on("mousemove", function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Animated Section Assortiment Single Floating Image
  // Source: http://jsfiddle.net/639Jj/1/

  $('.mouse-pos-list-image-wrap a').on('mouseenter', function() {
    $('.mouse-pos-list-image, .mouse-pos-list-btn, .mouse-pos-list-span, .mouse-pos-list-span-big').addClass('active');
  });
  $('.mouse-pos-list-image-wrap a').on('mouseleave', function() {
    $('.mouse-pos-list-image, .mouse-pos-list-btn, .mouse-pos-list-span, .mouse-pos-list-span-big').removeClass('active');
  });
  $('.single-tile-wrap a, .mouse-pos-list-archive a, .next-case-btn').on('mouseenter', function() {
    $('.mouse-pos-list-btn, .mouse-pos-list-span').addClass('active-big');
  });
  $('.single-tile-wrap a, .mouse-pos-list-archive a, .next-case-btn').on('mouseleave', function() {
    $('.mouse-pos-list-btn, .mouse-pos-list-span').removeClass('active-big');
  });
  $('main').on('mousedown', function() {
    $(".mouse-pos-list-btn, .mouse-pos-list-span").addClass('pressed');
  });
  $('main').on('mouseup', function() {
    $(".mouse-pos-list-btn, .mouse-pos-list-span").removeClass('pressed');
  });

  $('.mouse-pos-list-image-wrap li.visible').on('mouseenter', function() {

    var $elements = $(".mouse-pos-list-image-wrap li.visible");
    var index =  $elements.index($(this));
    var count = $(".mouse-pos-list-image li.visible").length;
    // [B3] 原站为 `if($(".float-image-wrap"))` —— jQuery 对象**恒为真值**，即使元素不存在。
    // 改为 `.length` 判断。当前无影响（元素不存在时 gsap.to 作用于空集合，无害）。
    if($(".float-image-wrap").length) {
        gsap.to($(".float-image-wrap"), {
          y: (index*100)/(count*-1) + "%",
          duration: .6,
          ease: Power2.easeInOut
        });
    }
    $(".mouse-pos-list-image.active .mouse-pos-list-image-bounce").addClass("active").delay(400).queue(function(next){
        $(this).removeClass("active");
        next();
    });

  });

  $('.archive-work-grid li').on('mouseenter', function() {
    $(".mouse-pos-list-btn").addClass("hover").delay(100).queue(function(next){
      $(this).removeClass("hover");
      next();
    });
  });

}

/**
* Visual Filter
*
* 三段 `setTimeout` 的 300/700/1000ms 时序是 `SPEC.md` §5.9 的 `[源码]` 描述，
* P3 已实测（见 `LEDGER.md` §3 的 P3 段落）。它嵌套了
* `scroll.stop/scrollTo/update/refresh/start`，**时序脆弱且依赖 scroll 是否已停** ——
* 任何"顺手重排"都会改变行为。
*/
function initVisualFilter() {

  // Visual Filter
  $(document).ready(function(){

    $('.toggle-row .btn').click(function(){
      if ($(this).hasClass('active')) {
          } else {
      $('.work-tiles li, .work-items li').addClass('tile-fade-out');
      scroll.stop();
      setTimeout(function() {
          $('.work-tiles li, .work-items li').removeClass('tile-fade-out');
          $('.work-tiles li, .work-items li').addClass('tile-fade-in');
          scroll.scrollTo( 'top', {'offset': 0, 'duration': 700, 'easing': [0.7, 0.00, 0.35, 1.00], 'disableLerp': true});
      }, 300);
      setTimeout(function() {
          $('.work-tiles li, .work-items li').removeClass('tile-fade-in');
          scroll.update();
          ScrollTrigger.refresh();
          scroll.start();
      }, 700);
      setTimeout(function() {
         scroll.update();
         console.log('scroll- updated');
     }, 1000);
      }
    });
    $('.all-btn').click(function(){
      if ($(this).hasClass('active')) {
      } else {
          $('.toggle-row .btn-normal').removeClass('active');
          $('.toggle-row .btn-normal').addClass('not-active');
          $(this).addClass('active');
          $(this).removeClass('not-active');
          setTimeout(function() {
            $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').addClass('visible');
          }, 300);
      }
    });
    $('.design-btn').click(function(){
      if ($(this).hasClass('active')) {
      } else {
          $('.toggle-row .btn-normal').removeClass('active');
          $('.toggle-row .btn-normal').addClass('not-active');
          $(this).addClass('active');
          $(this).removeClass('not-active');
          setTimeout(function() {
            $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').removeClass('visible');
            $('.mouse-pos-list-image li.design, .mouse-pos-list-image-wrap li.design, .work-tiles li.design').addClass('visible');
          }, 300);
      }
    });
    $('.development-btn').click(function(){
      if ($(this).hasClass('active')) {
      } else {
          $('.toggle-row .btn-normal').removeClass('active');
          $('.toggle-row .btn-normal').addClass('not-active');
          $(this).addClass('active');
          $(this).removeClass('not-active');
          setTimeout(function() {
            $('.mouse-pos-list-image li, .mouse-pos-list-image-wrap li, .work-tiles li').removeClass('visible');
            $('.mouse-pos-list-image li.development, .mouse-pos-list-image-wrap li.development, .work-tiles li.development').addClass('visible');
          }, 300);
      }
    });

    $('.grid-row .btn').click(function(){
      if ($(this).hasClass('active')) {
          } else {
      $('.grid-fade').addClass('grid-fade-out');
      scroll.stop();
      scroll.scrollTo( 'top', {'offset': 0, 'duration': 700, 'easing': [0.7, 0.00, 0.35, 1.00], 'disableLerp': true});
      setTimeout(function() {
        $('.grid-fade').removeClass('grid-fade-out');
        $('.grid-fade').addClass('grid-fade-in');
      }, 300);
      setTimeout(function() {
        $('.grid-fade').removeClass('grid-fade-in');
        scroll.update();
        ScrollTrigger.refresh();
        scroll.start();
      }, 700);
      }
    });
    $('.grid-row .rows-btn').click(function(){
      if ($(this).hasClass('active')) {
      } else {
          $('.grid-row .btn-normal').removeClass('active');
          $('.grid-row .btn-normal').addClass('not-active');
          Cookies.set("view", "rows", { expires: 14 });
          $(this).addClass('active');
          $(this).removeClass('not-active');
          setTimeout(function() {
            $('.grid-columns-part').removeClass('visible');
            $('.grid-rows-part').addClass('visible');
          }, 300);
      }
    });
    $('.grid-row .columns-btn').click(function(){
      if ($(this).hasClass('active')) {
      } else {
          $('.grid-row .btn-normal').removeClass('active');
          $('.grid-row .btn-normal').addClass('not-active');
          Cookies.set("view", "columns", { expires: 14 });
          $(this).addClass('active');
          $(this).removeClass('not-active');
          setTimeout(function() {
            $('.grid-rows-part').removeClass('visible');
            $('.grid-columns-part').addClass('visible');
          }, 300);
      }
    });

  });

}


/**
* Cookie Views
*
* 只用于 grid 的 rows/columns 视图（cookie `view`，`expires: 14`）。
* 筛选 cookie（`filter`）在原站**全部被注释掉**，故筛选不持久化 —— 照抄。
*/
function initCookieViews() {
  // Set cookie for columns/rows view
  // https://www.youtube.com/watch?v=rfwiyBoVwdQ&ab_channel=TimothyRicks
  if (Cookies.get("view") == "columns") {
    $('.grid-row .rows-btn').removeClass('active');
    $('.grid-row .columns-btn').addClass('active');
    $('#work .grid-rows-part').removeClass('visible');
    $('#work .grid-columns-part').addClass('visible');
    scroll.update();
    ScrollTrigger.refresh();
  }
}


/**
* Scrolltrigger Scroll Check
*/
function initScrolltriggerNav() {

  ScrollTrigger.create({
    start: 'top -30%',
    onUpdate: self => {
      $("main").addClass('scrolled');
    },
    onLeaveBack: () => {
      $("main").removeClass('scrolled');
    },
  });

}


/**
* Scrolltrigger Scroll Letters Home
*/
function initScrollLetters() {
  // Scrolling Letters Both Direction
  // https://codepen.io/GreenSock/pen/rNjvgjo
  // Fixed example with resizing
  // https://codepen.io/GreenSock/pen/QWqoKBv?editors=0010

  let direction = 1; // 1 = forward, -1 = backward scroll

  // [B4] 原站此处把第三个变量也命名为 `scroll`，**遮蔽了模块级的全局 `let scroll`**
  // （Locomotive 实例）。该函数作用域内 `scroll` 因此指向 ScrollTrigger 而非 Locomotive ——
  // 纯调试陷阱，行为本身正确。改名 `dirTrigger`。
  const roll1 = roll(".big-name .name-wrap", {duration: 18}),
        roll2 = roll(".rollingText02", {duration: 10}, true),
        dirTrigger = ScrollTrigger.create({
          trigger: document.querySelector('[data-scroll-container]'),
          onUpdate(self) {
            if (self.direction !== direction) {
              direction *= -1;
              gsap.to([roll1, roll2], {timeScale: direction, overwrite: true});
            }
          }
        });

  // helper function that clones the targets, places them next to the original, then animates the xPercent in a loop to make it appear to roll across the screen in a seamless loop.
  function roll(targets, vars, reverse) {
    vars = vars || {};
    vars.ease || (vars.ease = "none");
    const tl = gsap.timeline({
            repeat: -1,
            onReverseComplete() {
              this.totalTime(this.rawTime() + this.duration() * 10); // otherwise when the playhead gets back to the beginning, it'd stop. So push the playhead forward 10 iterations (it could be any number)
            }
          }),
          elements = gsap.utils.toArray(targets),
          clones = elements.map(el => {
            let clone = el.cloneNode(true);
            el.parentNode.appendChild(clone);
            return clone;
          }),
          positionClones = () => elements.forEach((el, i) => gsap.set(clones[i], {position: "absolute", overwrite: false, top: el.offsetTop, left: el.offsetLeft + (reverse ? -el.offsetWidth : el.offsetWidth)}));
    positionClones();
    elements.forEach((el, i) => tl.to([el, clones[i]], {xPercent: reverse ? 100 : -100, ...vars}, 0));
    window.addEventListener("resize", () => {
      let time = tl.totalTime(); // record the current time
      tl.totalTime(0); // rewind and clear out the timeline
      positionClones(); // reposition
      tl.totalTime(time); // jump back to the proper time
    });
    return tl;
  }

}



/**
* Scrolltrigger Nav
*
* 按**词**拆分（不是按行、不是按字符），生成
* `<span class="span-line"><span class="span-line-inner">词</span></span>`。
*/
function initTricksWords() {
  // Independently implemented from the word-animation DOM contract. Work on
  // text nodes so links, attributes, entities and repeated visits stay intact.
  const language = document.documentElement.lang || 'en';
  const cjk = /^(zh|ja)(-|$)/i.test(language);
  const segmenter = cjk && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter(language, { granularity: 'word' }) : null;

  document.querySelectorAll('.span-lines').forEach(heading => {
    const reader = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
      acceptNode(text) {
        return text.data.trim() && !text.parentElement.closest('.span-line, script, style, textarea')
          ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const pending = [];
    for (let text = reader.nextNode(); text; text = reader.nextNode()) pending.push(text);

    for (const text of pending) {
      const units = cjk
        ? (segmenter ? [...segmenter.segment(text.data)].map(part => part.segment) : [...text.data])
        : (text.data.match(/\s+|\S+/gu) || []);
      const fragment = document.createDocumentFragment();
      let previousWord = null;
      for (const unit of units) {
        if (!unit.trim()) {
          fragment.append(document.createTextNode(unit));
          previousWord = null;
        } else if (cjk && previousWord && /^[\p{Pe}\p{Pf}。，、！？：；,.!?;:]+$/u.test(unit)) {
          previousWord.append(document.createTextNode(unit));
        } else {
          const word = document.createElement('span');
          const content = document.createElement('span');
          word.classList.add('span-line');
          content.classList.add('span-line-inner');
          content.textContent = unit;
          word.append(content);
          fragment.append(word);
          previousWord = content;
        }
      }
      text.replaceWith(fragment);
    }
  });
}

/**
* Contact Form
*/
function initContactForm() {

  $('.field').on('input', function() {
    $(this).parent().toggleClass('not-empty', this.value.trim().length > 0);
  });

  $(function () {
      $('.field').focusout(function () {
          var text_val = $(this).val();
          $(this).parent().toggleClass('not-empty', text_val !== "");
      }).focusout();
  });

}

/**
* Footer Time Zone
*
* `#timeSpan` 是页面上**唯一**的时间依赖内容（`[实测]`：`index-new.js` 中
* `new Date()` / `setInterval` 仅此一处），其文本宽度会牵动祖先元素的 rect ——
* 故 harness 采集时必须冻结它，否则两次采集不可比（见 `lib/pipeline.mjs`）。
*/
function initTimeZone() {

   if(document.querySelector("#timeSpan")) {
   // Time zone
   // https://stackoverflow.com/questions/39418405/making-a-live-clock-in-javascript/67149791#67149791
   // https://stackoverflow.com/questions/8207655/get-time-of-specific-timezone
   // https://stackoverflow.com/questions/63572780/how-to-update-intl-datetimeformat-with-new-date

   const timeSpan = document.querySelector("#timeSpan");

   const optionsTime = {
      timeZone: 'Europe/Amsterdam',
      timeZoneName: 'short',
      // year: 'numeric',
      // month: 'numeric',
      // day: 'numeric',
      hour: '2-digit',
      hour12: 'true',
      minute: 'numeric',
      // second: 'numeric',
   };

   const formatter = new Intl.DateTimeFormat([], optionsTime);
   updateTime();
   setInterval(updateTime, 1000);

   function updateTime() {
         const dateTime = new Date();
         const formattedDateTime = formatter.format(dateTime);
         timeSpan.textContent = formattedDateTime;
   }
   }

}

/**
* Lazy Load
*
* 用 vanilla-lazyload（`elements_selector: ".lazy"`，仅此一个选项）。
*
* ★ 它的图片请求由 JS 在**运行时**插入，**不计入 `load` 事件** —— 所以
* "等到 `readyState === 'complete'`"**不保证**这些媒体已加载完。harness 因此额外有
* `settleLazyMedia()`（`ISSUES.md` ISSUE-013）。改动此处时要同步考虑那条判据。
*/
function initLazyLoad() {
    // https://github.com/locomotivemtl/locomotive-scroll/issues/225
    // https://github.com/verlok/vanilla-lazyload
    var lazyLoadInstance = new LazyLoad({
      elements_selector: ".lazy",
    });

}

/**
* Play Video Inview
*
* 每个 `.playpauze` 视频注册一条 ScrollTrigger 驱动 play()/pause()。
* ★ 这正是 `LEDGER.md` Q5 的现场：`play()` 返回的 Promise 尚未兑现就被 `pause()` 打断，
* 会产生 `The play() request was interrupted by a call to pause()` 的 pageerror ——
* **原站自身就有**（`[实测]` 51 条基线里 3 条带此错误）。照抄，未加 `.catch()`。
*/
function initPlayVideoInview() {

  let allVideoDivs = gsap.utils.toArray('.playpauze');

  allVideoDivs.forEach((videoDiv, i) => {

    let videoElem = videoDiv.querySelector('video')

    ScrollTrigger.create({
      scroller: document.querySelector('[data-scroll-container]'),
      trigger: videoElem,
      start: '0% 120%',
      end: '100% -20%',
      onEnter: () => videoElem.play(),
      onEnterBack: () => videoElem.play(),
      onLeave: () => videoElem.pause(),
      onLeaveBack: () => videoElem.pause(),
    });

  });
}

/**
* Scrolltrigger Animations Desktop + Mobile
*
* 注册次序即 `ScrollTrigger.getAll()` 的索引次序，是 P3/P4 验收的比对对象。
* **不要重排、不要把守卫拆成独立函数**（那会改变注册次序）。
*/
function initScrolltriggerAnimations() {

  if(document.querySelector(".footer-wrap")) {
  // Scrolltrigger Animation : Footer + hamburger
  $(".footer-wrap").each(function (index) {
    let triggerElement = $(this);
    let targetElementHamburger = $(".btn-hamburger .btn-click");

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        start: "50% 100%",
        end: "100% 120%",
        scrub: 0
      }
    });
    tl.from(targetElementHamburger, {
      boxShadow: "0px 0px 0px 0px rgb(0, 0, 0)",
      ease: "none"
    });
  });
  }

  // Scrolltrigger Animation : Span Lines Intro Home
  if(document.querySelector(".span-lines.animate")) {
  $(".span-lines.animate").each(function (index) {
    let triggerElement = $(this);
    // [A2] 原站此处是**全局**选择器 `$(".span-lines.animate .span-line-inner")`，未限定在
    // 当前 `each` 元素内 —— 多块 `.span-lines.animate` 共存时会重复触发/整体重播。
    // 当前潜伏未触发（全站只有 home 一处带 `.animate`），但内容替换（P8）后会显形。
    let targetElement = triggerElement.find(".span-line-inner");

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        toggleActions:'play none none reset',
        start: "0% 100%",
        end: "100% 0%"
      }
    });
    if(targetElement) {
      tl.from(targetElement, {
        y: "100%",
        stagger: .01,
        ease: "power3.out",
        duration: 1,
        delay: 0
      });
    }
  });
  }

  if(document.querySelector(".fade-in.animate")) {
  // Scrolltrigger Animation : Fade in
  $(".fade-in.animate").each(function (index) {
    let triggerElement = $(this);
    let targetElement = $(this);

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        toggleActions:'play none none reset',
        start: "0% 110%",
        end: "100% 0%",
      }
    });
    if(targetElement) {
      tl.from(targetElement, {
        y: "2em",
        opacity: 0,
        ease: "expo.out",
        duration: 1.75,
        delay: 0
      });
    }
  });
  }

  if(document.querySelector(".award-badge")) {
  // Scrolltrigger Animation : award badge
  $(".award-badge").each(function (index) {
    let triggerElement = $(this);
    let targetElement = $(".award-badge svg:nth-child(1)");

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerElement,
        start: "0% 100%",
        end: "100% 0%",
        scrub: 0
      }
    });
    tl.to(targetElement, {
      rotate: -90,
      ease: "none"
    });
  });
  }

  // Disable GSAP on Mobile
  // Source: https://greensock.com/forums/topic/26325-disabling-scrolltrigger-on-mobile-with-mediamatch/
  // 注意 `ScrollTrigger.matchMedia()` 每次调用都新建一个 MatchMedia 实例，且
  // 该 API 在 GSAP 3.11 起被标记废弃 —— 故版本锁 3.9.1（`SPEC.md` §2.2）。
  ScrollTrigger.matchMedia({

    // Desktop Only Scrolltrigger
    "(min-width: 721px)": function() {

      if(document.querySelector(".home-header .arrow")) {
      // Scrolltrigger Animation : Header Arrow
      $(".home-header").each(function (index) {
        let triggerElement = $(this);
        let targetElement = $(".home-header .arrow");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "100% 100%",
            end: "100% 0%",
            scrub: 0
          }
        });
        tl.to(targetElement, {
          rotate: 90,
          ease: "none"
        }, 0);
      });
      }

      if(document.querySelector(".footer-footer-wrap")) {
      // Scrolltrigger Animation : Footer General Footer
      $(".footer-footer-wrap").each(function (index) {
        let triggerElement = $(this);
        let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");
        let targetElementArrow = $("footer .arrow");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "0% 100%",
            end: "100% 100%",
            scrub: 0
          }
        });
        tl.to(targetElementRound, {
          height: 0,
          ease: "none"
        }, 0)
        .from(targetElementArrow, {
          rotate: 15,
          ease: "none"
        }, 0);
      });
      }

      if(document.querySelector(".footer-case-wrap")) {
        // Scrolltrigger Animation : Footer Case
        $(".footer-case-wrap").each(function (index) {
          let triggerElement = $(this);
          let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");

          let tl = gsap.timeline({
            scrollTrigger: {
              trigger: triggerElement,
              start: "0% 100%",
              end: "100% 100%",
              scrub: 0
            }
          });
          tl.to(targetElementRound, {
            height: 0,
            ease: "none"
          }, 0);
        });
        }

      if(document.querySelector(".about-image .single-about-image")) {
      // Scrolltrigger Animation : About
      $(".about-image .single-about-image").each(function (index) {
        let triggerElement = $(this);
        let targetElement = $(".about-image .arrow");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "15% 100%",
            end: "100% 0%",
            scrub: 0,
          }
        });
        tl.to(targetElement, {
          rotate: 60,
          ease: "none"
        }, 0);
      });
      }


      if(document.querySelector(".about-services")) {
      // Scrolltrigger Animation : About Services BG
      $(".about-services").each(function (index) {
        let triggerElement = $(this);
        let targetElement = $(".about-header, .line-globe, .about-image, .about-services");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "-25% 100%",
            end: "100% 100%",
            scrub: 0,
          }
        });
        tl.set(targetElement, {
          backgroundColor: "#FFFFFF",
        })
        tl.to(targetElement, {
          backgroundColor: "#E9EAEB",
          ease: "none",
        });
      });
      }

      if(document.querySelector(".digital-ball .globe")) {
      // Scrolltrigger Animation : Globe
      $("main").each(function (index) {
        let triggerElement = $(this);
        let targetElement = $(".digital-ball .globe");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "100% 100%",
            end: "100% 0%",
            scrub: 0,
          }
        });

        tl.to(targetElement, {
          ease: "none",
          rotate: 90
        });
      });
      }

    }, // End Desktop Only Scrolltrigger

    // Mobile Only Scrolltrigger
    "(max-width: 720px)": function() {

      if(document.querySelector(".footer-wrap")) {
      // Scrolltrigger Animation : Footer
      $(".footer-wrap").each(function (index) {
        let triggerElement = $(this);
        let targetElementRound = $(".footer-rounded-div .rounded-div-wrap");

        let tl = gsap.timeline({
          scrollTrigger: {
            trigger: triggerElement,
            start: "0% 100%",
            end: "100% 100%",
            scrub: 0
          }
        });
        tl.to(targetElementRound, {
          height: 0,
          ease: "none"
        }, 0);
      });
    }

    } // End Mobile Only ScrollTrigger

  }); // End GSAP Matchmedia

}
