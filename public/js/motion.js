/* Progressive motion; no dependency, no delayed clicks, no persistent RAF loop. */
;(function () {
  'use strict'
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  var played = new WeakSet()
  var active = new Set()
  var entranceObserver
  var updateTabs = function () {}

  function animate(el, frames, options) {
    if (reduce.matches || !el || !el.animate) return
    var animation = el.animate(frames, options)
    active.add(animation)
    function clean() { active.delete(animation) }
    animation.onfinish = clean
    animation.oncancel = clean
    if (document.hidden) animation.pause()
    return animation
  }

  function reveal(el, delay) {
    if (played.has(el)) return
    played.add(el)
    animate(el, [
      { opacity: 0, translate: '0 20px' },
      { opacity: 1, translate: '0 0' },
    ], { duration: 650, delay: delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' })
    el.querySelectorAll('.tien-do > i, .thanh-mini > i').forEach(function (bar) {
      animate(bar, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
        duration: 1050, delay: delay + 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards',
      })
      bar.style.transformOrigin = 'left'
    })
    el.querySelectorAll('.budget-ring .value').forEach(function (ring) {
      animate(ring, [{ strokeDasharray: '0 100' }, { strokeDasharray: ring.getAttribute('stroke-dasharray') }], {
        duration: 1250, delay: delay + 140, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards',
      })
    })
  }

  function init() {
    var surfaces = document.querySelectorAll('.dau-trang, .camera-giua, .budget-card, .recent-card, .habit-strip, .noi-dung .the:not(.recent-card), .the-chi-tieu, .o-dm, .hop-auth, .auth-thong-diep, .the-hom-nay')
    if ('IntersectionObserver' in window) {
      entranceObserver = new IntersectionObserver(function (entries) {
        var index = 0
        entries.forEach(function (entry) {
          entry.target.classList.toggle('motion-visible', entry.isIntersecting)
          if (entry.isIntersecting) reveal(entry.target, Math.min(index++ * 65, 260))
        })
      }, { threshold: .08 })
      surfaces.forEach(function (el) { entranceObserver.observe(el) })
    } else {
      surfaces.forEach(function (el, index) { el.classList.add('motion-visible'); reveal(el, Math.min(index * 60, 240)) })
    }

    // Sliding selection follows real button widths, including after fonts load.
    var mode = document.querySelector('.capture-mode')
    if (mode) {
      var indicator = document.createElement('span')
      indicator.className = 'mode-indicator'
      indicator.setAttribute('aria-hidden', 'true')
      mode.prepend(indicator)
      updateTabs = function () {
        mode.classList.toggle('motion-tabs', !reduce.matches)
        var selected = mode.querySelector('[aria-pressed="true"]')
        if (!selected) return
        indicator.style.width = selected.offsetWidth + 'px'
        indicator.style.transform = 'translateX(' + selected.offsetLeft + 'px)'
      }
      new MutationObserver(updateTabs).observe(mode, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] })
      if ('ResizeObserver' in window) new ResizeObserver(updateTabs).observe(mode)
      else window.addEventListener('resize', updateTabs)
      if (document.fonts) document.fonts.ready.then(updateTabs)
      updateTabs()
    }

    document.querySelectorAll('.budget-card, .khung-ngam').forEach(function (el) {
      var frame = 0
      var pointer
      function reset() {
        cancelAnimationFrame(frame)
        frame = 0
        el.style.removeProperty('--tilt-x')
        el.style.removeProperty('--tilt-y')
        el.style.removeProperty('--light-x')
        el.style.removeProperty('--light-y')
      }
      el.addEventListener('pointermove', function (event) {
        if (reduce.matches || !finePointer.matches || event.pointerType === 'touch') return
        pointer = event
        if (frame) return
        frame = requestAnimationFrame(function () {
          frame = 0
          var rect = el.getBoundingClientRect()
          if (!rect.width || !rect.height) return
          var x = Math.max(0, Math.min(1, (pointer.clientX - rect.left) / rect.width))
          var y = Math.max(0, Math.min(1, (pointer.clientY - rect.top) / rect.height))
          el.style.setProperty('--light-x', (x * 100).toFixed(1) + '%')
          el.style.setProperty('--light-y', (y * 100).toFixed(1) + '%')
          if (el.classList.contains('budget-card')) {
            el.style.setProperty('--tilt-x', ((.5 - y) * 5).toFixed(2) + 'deg')
            el.style.setProperty('--tilt-y', ((x - .5) * 5).toFixed(2) + 'deg')
          }
        })
      }, { passive: true })
      el.addEventListener('pointerleave', reset)
      el.addEventListener('pointercancel', reset)
      reduce.addEventListener('change', reset)
      finePointer.addEventListener('change', reset)
      document.addEventListener('visibilitychange', reset)
    })

    // Feedback runs beside the action; file pickers and form submits stay synchronous.
    document.addEventListener('click', function (event) {
      if (reduce.matches) return
      var button = event.target.closest('.nut, .nut-icon, .nut-phu-chup, button.chip, .capture-mode button')
      if (!button || button.disabled) return
      var rect = button.getBoundingClientRect()
      var size = Math.max(rect.width, rect.height) * 2
      var ripple = document.createElement('span')
      ripple.className = 'motion-ripple'
      ripple.setAttribute('aria-hidden', 'true')
      ripple.style.width = ripple.style.height = size + 'px'
      ripple.style.left = (event.detail ? event.clientX - rect.left : rect.width / 2) - size / 2 + 'px'
      ripple.style.top = (event.detail ? event.clientY - rect.top : rect.height / 2) - size / 2 + 'px'
      button.classList.add('motion-ripple-host')
      button.appendChild(ripple)
      setTimeout(function () { ripple.remove() }, 600)
    })

    document.addEventListener('visibilitychange', function () {
      document.documentElement.classList.toggle('motion-paused', document.hidden)
      active.forEach(function (animation) { if (document.hidden) animation.pause(); else animation.play() })
    })
    document.documentElement.classList.toggle('motion-paused', document.hidden)
    reduce.addEventListener('change', function () {
      if (reduce.matches) active.forEach(function (animation) { animation.cancel() })
      updateTabs()
    })
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
