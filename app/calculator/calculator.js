var mmrCalculator = angular.module("mmrCalculator", []);
mmrCalculator.controller("Calculator", function($scope, $http, $q) {

    $scope.players = [];
    initializeTeams();

    /*var playerIds = [
        75266609,
        132776452,
        84686772,
        83595907,
        123259336,
        49874993,
        73021235,
        56308429
    ];*/

    $http({
        url : 'https://spreadsheets.google.com/feeds/list/1MUUbce5K4f6I_U1jP6ymK54QKLIjCvFGyRL2Gbf0rgM/od6/public/basic?alt=json',
        method : 'GET'
    }).then(function(spreadsheetResult) {
        var i;
        var playerIds = [];
        var entries = spreadsheetResult.data.feed.entry;
        for (i = 0; i < entries.length; i++) {
            var id = entries[i].title.$t;
            if (parseInt(id) !== NaN) {
                playerIds.push(id);
            }
        }

        var promises = [];
        for (i = 0; i < playerIds.length; i++) {
            var playerId = playerIds[i];
            promises.push($http({
                url   : 'https://api.opendota.com/api/players/' + playerId,
                method: 'GET'
            }));
        }

        $q.all(promises).then(function (result) {
            for (var i = 0; i < result.length; i++) {
                var soloMMR = parseInt(result[i].data.solo_competitive_rank);
                var partyMMR = parseInt(result[i].data.competitive_rank);
                var actualMMR = partyMMR;
                if (soloMMR > partyMMR) {
                    actualMMR = Math.round((soloMMR + partyMMR) / 2);
                }
                $scope.players.push(
                    {
                        name: result[i].data.profile.personaname,
                        id: result[i].data.profile.account_id,
                        soloMMR: soloMMR,
                        partyMMR: partyMMR,
                        actualMMR: actualMMR,
                        selected: false
                    }
                );
            }
        });

        $scope.selectPlayer = function() {
            this.player.selected = !this.player.selected;
            updateTeams();
        };

        function updateTeams() {
            var activePlayers = [];
            var i;
            for (i = 0; i < $scope.players.length; i++) {
                if ($scope.players[i].selected) {
                    activePlayers.push($scope.players[i]);
                }
            }
            if (activePlayers.length === 0) {
                initializeTeams()
            } else if (activePlayers.length % 2 === 0) {
                initializeTeams();
                var targetTotal = 0;
                var bestDiff = -1;
                var bestTeam;
                for (i = 0; i < activePlayers.length; i++) {
                    targetTotal += activePlayers[i].actualMMR;
                }
                var combinations = getCombinations([activePlayers[0]], activePlayers.slice(1), (activePlayers.length / 2));
                console.log(combinations);
                for (i = 0; i < combinations.length; i++) {
                    var currentTotal = 0;
                    for (var j = 0; j < combinations[i].length; j++) {
                        currentTotal += combinations[i][j].actualMMR;
                    }
                    var currentDiff = Math.abs(targetTotal - currentTotal);
                    if (bestDiff === -1 || currentDiff < bestDiff) {
                        bestDiff = currentDiff;
                        bestTeam = combinations[i];
                    }
                }
                $scope.team1 = bestTeam;
                for (i = 0; i < activePlayers.length; i++) {
                    if (bestTeam.indexOf(activePlayers[i]) === -1) {
                        $scope.team2.push(activePlayers[i]);
                    }
                }
                $scope.team1Average = calculateAverage($scope.team1);
                $scope.team2Average = calculateAverage($scope.team2);
                $scope.averageDifference = Math.abs($scope.team1Average - $scope.team2Average);
            }
        }

        function getCombinations(active, rest, targetSize) {
            var results = [];
            function getCombinationsRecurse(active, rest, targetSize) {
                if (rest.length === 0 || active.length === targetSize) {
                    results.push(active);
                } else {
                    var newActive = active.slice();
                    newActive.push(rest[0]);
                    getCombinationsRecurse(newActive, rest.slice(1), targetSize);
                    if (active.length + rest.length > targetSize) {
                        getCombinationsRecurse(active, rest.slice(1), targetSize);
                    }
                    return results;
                }
            }

            getCombinationsRecurse(active, rest, targetSize);
            return results;
        }

        function calculateAverage(players) {
            var total = 0;
            for (var i = 0; i < players.length; i++) {
                total += players[i].actualMMR;
            }
            return Math.round(total / players.length);
        }
    });

    function initializeTeams() {
        $scope.team1 = [];
        $scope.team2 = [];
        $scope.team1Average = 0;
        $scope.team2Average = 0;
        $scope.averageDifference = 0;
    }

});