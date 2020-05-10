// Create Countdown
var Countdown = {

  $digits: $('.digit'),

  init: function (val) {
    this.changeDisplayedNum(val)
  },

  animateDigit: function ($el, value) {
    var $top = $el.find('.top')
    var $bottom = $el.find('.bottom')
    var $back_top = $el.find('.top-back')
    var $back_bottom = $el.find('.bottom-back')

    // Before we begin, change the back value
    $back_top.find('span').html(value)

    // Also change the back bottom value
    $back_bottom.find('span').html(value)

    // Then animate
    TweenMax.to($top, 0.8, {
      rotationX: '-180deg',
      transformPerspective: 300,
	      ease: Quart.easeOut,
      onComplete: function () {
        $top.html(value)

        $bottom.html(value)

        TweenMax.set($top, { rotationX: 0 })
      }
    })

    TweenMax.to($back_top, 0.8, {
      rotationX: 0,
      transformPerspective: 300,
	      ease: Quart.easeOut,
      clearProps: 'all'
    })
  },
  
  changeDisplayedNum: function (num) {
    var that = this;
    var digitArr = []
    num.toString().split('').forEach(function (el){
      digitArr.push(Number.parseInt(el))
    })
    digitArr.forEach(function (val, ind) {
      that.animateDigit(that.$digits.eq(ind), val)
    })
  }
}
// Let's go !
// Countdown.init(547800);
setTimeout(function (){ Countdown.init(547800); }, 500)