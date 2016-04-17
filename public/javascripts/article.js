/* globals angular */

(function () {
    // Quick way to read url query params (https://github.com/angular/angular.js/issues/7239#issuecomment-42047533)
    var parseLocation = function(location) {
      var pairs = location.substring(1).split("&");
      var obj = {};
      var pair;
      var i;

      for ( i in pairs ) {
        if ( pairs[i] === "" ) continue;

        pair = pairs[i].split("=");
        obj[ decodeURIComponent( pair[0] ) ] = decodeURIComponent( pair[1] );
      }

      return obj;
    };

  function articleController ($scope, $http, $location) {
      console.log($location.search())
    var hash = parseLocation(window.location.search).h
    if(!hash) {
        window.location = '/feed'
    }
    // Get the list of keys.
    $http.get('/api/get/' + hash)
      .then(function (response) {
        $scope.article = JSON.parse(JSON.parse(response.data))
        $scope.article.key = hash
      })
  }

  angular.module('article', []).controller('articleController', ['$scope', '$http', '$location', articleController])
})()
