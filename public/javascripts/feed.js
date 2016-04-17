/* globals angular */

(function () {
  function feedController ($scope, $http) {
    $scope.keys = []
    $scope.articles = []

    var loadIndex = 0
    var loadIndexIncrement = 10

    // Get the list of keys.
    $http.get('/api/get')
      .then(function (response) {
        $scope.keys = response.data

        $scope.keys.slice(loadIndex, loadIndex += loadIndexIncrement).forEach(function (key) {
          $http.get('api/get/' + key)
            .then(function (response) {
              var responseObject = JSON.parse(JSON.parse(response.data))
              responseObject.key = key
              responseObject.content = responseObject.content.substring(0, 250) + '...'
              $scope.articles.push(responseObject)
            })
        })
      })

    $scope.loadMore = function () {
      $scope.keys.slice(loadIndex, loadIndex += loadIndexIncrement).forEach(function (key) {
        $http.get('api/get/' + key)
          .then(function (response) {
            var responseObject = JSON.parse(JSON.parse(response.data))
            responseObject.key = key
            if(responseObject.content.length > 250) {
                responseObject.content = responseObject.content.substring(0, 250) + '...'
            }
            $scope.articles.push(responseObject)
          })
      })
    }
  }

  angular.module('feed', []).controller('feedController', ['$scope', '$http', feedController])
})()
