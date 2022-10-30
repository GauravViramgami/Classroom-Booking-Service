(function ($) {
    "use strict";

    // Preloader
    $(window).on('load', function () {
        if ($('#preloader').length) {
            $('#preloader').delay(100).fadeOut('slow', function () {
                $(this).remove();
            });
        }
    });

    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 100) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({
            scrollTop: 0
        }, 1500, 'easeInOutExpo');
        return false;
    });

    /*--/ Star ScrollTop /--*/
    $('.scrolltop-mf').on("click", function () {
        $('html, body').animate({
            scrollTop: 0
        }, 1000);
    });

    /*--/ Star Counter /--*/
    $('.counter').counterUp({
        delay: 15,
        time: 2000
    });

    /*--/ Star Scrolling nav /--*/
    var mainNav_height = $('#mainNav').outerHeight() - 22;
    $('a.js-scroll[href*="#"]:not([href="#"])').on("click", function () {
        if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
            var target = $(this.hash);
            target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
            if (target.length) {
                var scrollto = target.offset().top - mainNav_height;
                $('html, body').animate({
                    scrollTop: scrollto
                }, 1000, "easeInOutExpo");
                return false;
            }
        }
    });

    // Scroll to sections on load with hash links
    if (window.location.hash) {
        var initial_nav = window.location.hash;
        if ($(initial_nav).length) {
            var scrollto_initial = $(initial_nav).offset().top - mainNav_height;
            $('html, body').animate({
                scrollTop: scrollto_initial
            }, 1000, "easeInOutExpo");
        }
    }

    /*--/ Star Typed /--*/
    if ($('.text-slider').length == 1) {
        var typed_strings = $('.text-slider-items').text();
        var typed = new Typed('.text-slider', {
            strings: typed_strings.split(','),
            typeSpeed: 80,
            loop: false,
            backDelay: 1100,
            backSpeed: 30
        });
    }

    var border_color = $('#name').css('border-color');
    var border_width = $('#name').css('border-width');
    var error_color = "#d93025";
    var error_width = "3px";

    /*--/ Email /--*/
    $('#email').change(function () {
        if (!$('#email').val() || $('#email').val().substring($('#email').val().length - 12) != '@iitgn.ac.in') {
            $('#email-error').css("display", "block");
            $('#email').css("border-color", error_color);
            $('#email').css("border-width", error_width);
            if (!$('#email').val()) {
                $('#email-error').text("This is a required question");
            } else {
                $('#email-error').text("Invalid Email Address. You must provide your IITGN email address.");
            }
        } else {
            $('#email-error').css("display", "none");
            $('#email').css("border-color", border_color);
            $('#email').css("border-width", border_width);
            $('#email-error').text("");
        }
    });

    /*--/ Room /--*/
    $('#room').change(function () {
        if (!$('#room').val()) {
            $(this).css("border-color", error_color);
            $(this).css("border-width", error_width);
            $('#room-error').css("display", "block");
            $('#room-error').text("This is a required question");
        } else {
            $(this).css("border-color", border_color);
            $(this).css("border-width", border_width);
            $('#room-error').css("display", "none");
            $('#room-error').text("");
        }
    });

    /*************************/
    /*--/ Form Validation /--*/
    /*************************/

    $.fn.wait = function (e) {
        e.preventDefault();
        return false;
    }
    // $('form').on('submit',function (e) {
    $.fn.form_submit = function (e) {
        e.preventDefault();
        var failed = false;

        /* Validating Email */
        if (!$('#email').val() || $('#email').val().substring($('#email').val().length - 12) != '@iitgn.ac.in') {
            failed = true;
            $('#email-error').css("display", "block");
            $('#email').css("border-color", error_color);
            $('#email').css("border-width", error_width);
            if (!$('#email').val()) {
                $('#email-error').text("This is a required question");
            } else {
                $('#email-error').text("Invalid Email Address. You must provide your IITGN email address.");
            }
        }

        /* Validating Room */
        if (!$('#room').val()) {
            failed = true;
            $('#room-error').css("display", "block");
            $('#room-error').text("This is a required question");
            $('#room').css("border-color", error_color);
            $('#room').css("border-width", error_width);
        }

        if (failed) {
            $('html, body').animate({
                scrollTop: $("#main").offset().top
            }, 2000);
            return false;
        }

        var form_data = {
            "Email": $('#email').val(),
            "Room": $('#room').val()
        };

        const scriptURL = 'https://script.google.com/macros/s/AKfycbzgihfW4R9irGGS7uHWylywLMmkto51eeFFr97kXyJfN1p7Zqxf4MQGgwm0e0fwX8nz/exec';

        $.get(scriptURL, form_data, function (response) {
            $('form').off('submit', $.fn.wait);
            if (response.result == "no booking") {
                swal("No Upcoming Bookings!", "You have no upcoming bookings for this room associated with your account.", "success").then(value => {
                    $('form').submit();
                });
            } else if (response.result == "approved") {
                var time = response.start_time.split("T")[1].slice(0, 5);
                swal("Success!", "Your booking for this room starting at " + time + " have been approved!", "success").then(value => {
                    $('form').submit();
                });
            } else {
                console.log(response.error);
                $('form').on('submit', $.fn.form_submit);
                swal("Error!", "There was an error in submitting the form. Please try again.", "error");
            }
        });

        $('form').off('submit', $.fn.form_submit);
        $('form').on('submit', $.fn.wait);
        return false;
    };
    $('form').on('submit', $.fn.form_submit);

})(jQuery);