(function ($) {
 "use strict";
    
/*----------------------------
 Navbar nav
------------------------------ */
    var menu_btn = $('.menu-btn');
    menu_btn.on("click", function () {
        $(this).toggleClass("active");
        $(".icon-header").toggleClass("active");
    });
	
/*---------------------
 TOP Menu Stick
--------------------- */
	var s = $(window);
	  var sticky_id = $("#sticker");
	  s.on('scroll',function() {    
		var scroll = s.scrollTop();
		if (scroll < 100) {
		  sticky_id.removeClass("stick");
		}else{
		  sticky_id.addClass("stick");
		}
	  });
    
/*----------------------------
Page Scroll
------------------------------ */

	jQuery('a.page-scroll').on('click', function(event) {
		var $anchor = $(this);
		  $('html, body').stop().animate({
			  scrollTop: $($anchor.attr('href')).offset().top -60
			}, 1500, 'easeInOutExpo');
		event.preventDefault();
	}); 
       
/*---------------------
  venobox
--------------------- */
	var veno_box = $('.venobox');
	veno_box.venobox();    
	
	
	
/*--------------------------
preloader
---------------------------- */	
	$(window).on('load',function(){
		var pre_loader = $('#preloader')
	pre_loader.fadeOut('slow',function(){$(this).remove();});
	});	
	
	
/*----------------------------
 jQuery MeanMenu
------------------------------ */
    var mean_menu = $('nav#dropdown');
    mean_menu.meanmenu();
	
/*--------------------------
 scrollUp
---------------------------- */
	$.scrollUp({
		scrollText: 'scroll top',
		easingType: 'linear',
		scrollSpeed: 900,
		animation: 'fade'
	});
	
	
/*--------------------------
 MagnificPopup
---------------------------- */	
    $('.video-play').magnificPopup({
        type: 'iframe'
    });
    
/*----------------------------
 Counter js active
------------------------------ */
    var count = $('.counter');
    count.counterUp({
		delay: 40,
		time: 3000
	});
	
	
/*--------------------------
 Parallax
---------------------------- */	
    var parallaxeffect = $(window);
    parallaxeffect.stellar({
        responsive: true,
        positionProperty: 'position',
        horizontalScrolling: false
    });
    
/*---------------------
 Award carousel
---------------------*/
	var award_carousel = $('.award-carousel');
	award_carousel.owlCarousel({
        loop:true,
        nav:false,		
        autoplay:false,
        dots:false,
        responsive:{
            0:{
                items:1
            },
            700:{
                items:2
            },
            1000:{
                items:3
            }
        }
    });
/*---------------------
 photo carousel
---------------------*/
	var photo_carousel = $('.photo-carousel');
	photo_carousel.owlCarousel({
        loop:true,
        nav:false,		
        autoplay:false,
        dots:false,
        responsive:{
            0:{
                items:1
            },
            700:{
                items:3
            },
            1000:{
                items:5
            }
        }
    });
/*---------------------
 Testimonial carousel
---------------------*/
    var test_carousel = $('.testimonial-carousel');
    test_carousel.owlCarousel({
        loop:true,
        nav:false,
        dots:true,
		margin:50,
        autoplay:false,
        center: true,
        responsive:{
            0:{
                items:1
            },
            768:{
                items:1
            },
            1000:{
                items:2
            }
        }
    });
/*--------------------------
     slider carousel
---------------------------- */
    var intro_carousel = $('.intro-carousel');
    intro_carousel.owlCarousel({
        loop:true,
        nav:true,		
        autoplay:false,
        dots:false,
        navText: ["<i class='ti-angle-left'></i>","<i class='ti-angle-right'></i>"],
        responsive:{
            0:{
                items:1
            },
            600:{
                items:1
            },
            1000:{
                items:1
            }
        }
    }); 
/*--------------------------
     Brand carousel
---------------------------- */
    var brand_carousel = $('.brand-carousel');
    brand_carousel.owlCarousel({
        loop:true,
        nav:false,		
        autoplay:false,
        dots:false,
        margin:30,
        responsive:{
            0:{
                items:1
            },
            600:{
                items:3
            },
            1000:{
                items:5
            }
        }
    }); 
	
/*--------------------------
     contact-from
---------------------------- */
    $("#contactForm").on("submit", function (event) {
        if (event.isDefaultPrevented()) {
            // handle the invalid form...
            formError();
            submitMSG(false, "Did you fill in the form properly?");
        } else {
            // everything looks good!
            event.preventDefault();
            submitForm();
        }
    });
    function submitForm(){


        const payload = {
            name: $("#name").val(),
            email: $("#email").val(),
            msg_subject: $("#msg_subject").val(),
            message: $("#message").val()
        };


        $.ajax({
            url: "/netlify/functions/contact",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify(payload),
            success: function(resp) {
            // server returns "success" or an error message
            alert(resp);
            // optionally clear the form:
            $("#contactForm")[0].reset();
            },
            error: function(xhr) {
            alert(xhr.responseText || "Error sending message");
            }
  });
    }

    function formSuccess(){
        $("#contactForm")[0].reset();
        submitMSG(true, "Message Submitted!")
    }

    function formError(){
        $("#contactForm").removeClass().addClass('shake animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass();
        });
    }

    function submitMSG(valid, msg){
        if(valid){
            var msgClasses = "h3 text-center tada animated text-success";
        } else {
            var msgClasses = "h3 text-center text-danger";
        }
        $("#msgSubmit").removeClass().addClass(msgClasses).text(msg);
    }
    
	

})(jQuery); 