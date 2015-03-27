'use strict';

angular.module('f9-webrtc')

    .controller('CallCtrl', ['$scope', '$state', '$rootScope', '$timeout', '$ionicModal', '$stateParams', '$document', 'CTIService', 'ContactsService', function($scope, $state, $rootScope, $timeout, $ionicModal, $stateParams, $document, CTIService, ContactsService) {

        $scope.callInProgress = false;

        $scope.contactName = $stateParams.contactName;

        // TODO
        $scope.isCalling = $stateParams.isCalling === 'true';

        // TODO
        $scope.muted = false;
        var _phoneRTC,
            session,
            _session;



        // answer a call if the user is the callee
        $scope.answer = function() {
            if ($scope.callInProgress) {
                return;
            }
            $scope.callInProgress = true;
            console.log('CallCtrl::answer');
            CTIService.answer();
            if (_session) {
                _session.call(); // -> PhoneRTCProxy::call()
                // not sure if there is any point to this...
                _phoneRTC.addStream(true, onMediaSuccess, onMediaFailure);
                $timeout($scope.updateVideoPosition, 1000);
                attachStream();
            }
        };

        // hang up the current call
        $scope.hangup = function() {
            CTIService.hangup();
            $scope.callInProgress = false;
        };

        // toggles the audio mute
        // TODO
        $scope.toggleMute = function() {

        };


        // Will be always be called by the update function on first launch
        // either the call is `outgoing` or it is `outgoing`
        // if the call is `outgoing` we create an Offer
        // if the call is `incoming` we create a Session
        var handleLineCall = function(data) {
            console.log('A CallCtrl::handleLineCall() | data: ', data);

            session = CTIService.getSession();

            var isInitiator = (session.direction === 'outgoing');

            _phoneRTC = CTIService.getPhoneRTC(isInitiator);

            console.log('B CallCtrl::handleLineCall() | direction: ', session.direction);

            if (session.direction === 'outgoing') {
                _phoneRTC.createOffer(onSuccessOut, onFailure);
            }

            if (session.direction === 'incoming') {
                _phoneRTC.Session(onSuccessIn, onFailure);
            }

            attachStream();
        };

        // handlers for the jssip engine
        // out
        // @param session -
        var onSuccessOut = function(session) {
            _session = session;
            addEvents();
            _session.call();
            _phoneRTC.addStream(true, onMediaSuccess, onMediaFailure);
            console.log('PhoneRTC Offer Success Ready ', _phoneRTC.isReady());
            $timeout($scope.updateVideoPosition, 1000);
        };
        // in
        var onSuccessIn = function(session) {
            _session = session;
            console.log('PhoneRTC Session has been created Ready ', _phoneRTC.isReady());
            addEvents();
            // wait to accept call
        };


        // attaches the stream as audio
        var attachStream = function() {
            console.log('A CallCtrl::attachStream | streams: ', CTIService.getStreams());
            console.log('B CallCtrl::attachStream | Ready ', _phoneRTC.isReady());
            if ($scope.currentSession) {
                try {
                    var streams = CTIService.getStreams();
                    attachMediaStream($document[0].getElementById('audio'), streams[0]);
                }
                catch (error) {
                    console.log('CallCtrl::attachStream -> Error', error);
                }
            }
        };

        // handlers for the media stream
        // success
        var onMediaSuccess = function() {
           // console.log('CallCtrl::onMediaSuccess');
        };
        // failure
        var onMediaFailure = function() {
            console.log('CallCtrl::onMediaFailure');
        };

        //
        var addEvents = function() {
            _session.on('sendMessage', function(data) {
                //console.log('CallCtrl::Message::sendMessage: ', data);
            });
            _session.on('disconnect', function() {
                console.log('CallCtrl::Message::disconnect');
            });
            _session.on('answer', function() {
                console.log('CallCtrl::Message::Answered!');
            });
        };

        var onFailure = function(error) {
            console.log('CallCtrl::Offer failure: ', error);
        };


        // watch the service for updates to the login status
        $scope.$watch(CTIService.getCTIData, function(newValue, oldValue, scope) {
            //console.log('CallCtrl -> getCTIData |  newValue: ', newValue);
            $scope.status = newValue;
            handleUpdate(newValue);
        });

        // the handler for status updates
        var handleUpdate = function(data) {
            if (data.code === 1) {
                $scope.callInProgress = true;
            }
            if (data.status) {
                // call active
                $scope.party = data.party;
                // if the call is being made
                if (data.code === 0 || data.code === 1) {
                    handleLineCall(data);
                }
            } else {
                // call inactive
                if (data.code === -1) {
                    // call has been hung-up, so back to the contacts
                    $state.go('app.contacts');
                    $scope.callInProgress = false;
                }
            }
        };

        $scope.updateVideoPosition = function() {
            $rootScope.$broadcast('videoView.updatePosition');
        };
    }]);
