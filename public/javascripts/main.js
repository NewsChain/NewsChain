$(function() {
	$.scrollify({
		section:".panel"
	});
	$(".scroll,.scroll-btn").click(function(e) {
		e.preventDefault();
		$.scrollify.next();
	});	
});