import React from 'react';
import io from 'socket.io-client';
import queryString from 'query-string';
import PrioritizationEnd from './PrioritizationEnd.jsx'
import Room from '../model/Room.js'
import ChoicesView from './view/ChoicesView.jsx'
import ErrorBoard from './ErrorBoard.jsx';
import Loader from './Loader.jsx';


let socket = false;
if (typeof socketAddress !== 'undefined') {
    if (socketAddress !== null) {
        socket = io(socketAddress);
    }
}

const params = queryString.parse(location.search);

class Choices extends React.Component {
    constructor(props) {
        super(props);
        let component = this
        this.handleCardClicked = this.handleCardClicked.bind(this)
        this.BoardApi = this.props.BoardApi
        this.renderForbidden = this.renderForbidden.bind(this)
        this.renderLoading = this.renderLoading.bind(this)
        this.room = false;
        this.state = {
            leftCard: null,
            rightCard: null,
            ended: false,
            voters: {left: [], right: []},
            hasVoted: false,
            hasBoardPermissions: null,
            selectedSide: null,
            roomVoters: [],
            boardId : null,
        }
        if (this.props.roomKey !== null) {
            this.setUpRoom(component);
        }
        if (socket) {
            this.setUpSocket(component);
        }
    }

    setUpSocket(component) {
        socket.on('votesInfo', function (leftVoters, rightVoters) {
            component.setState({
                voters: {
                    left: leftVoters,
                    right: rightVoters,
                }
            })
        });

        socket.on('castBoardIdToVoters', function (boardId) {
            component.BoardApi.getBoard(boardId, function () {
                component.setState({
                    boardId : boardId,
                    hasBoardPermissions: true
                },function(){
                    component.room.castGetCurrentChoice();
                })
            }, function () {
                component.setState({
                    boardId : boardId,
                    hasBoardPermissions: false
                }, function () {
                    component.room.castGetCurrentChoice();
                    component.room.leave(component.sortelloId)
                })
            });
        });

        socket.on('nextChoice', function (leftCard, rightCard) {
            component.setState({
                leftCard: leftCard,
                rightCard: rightCard,
                hasVoted: false,
                selectedSide: null
            })
        });

        socket.on('roomVotersUpdated', function (roomVoters) {
            component.setState({
                roomVoters: roomVoters
            })
        });

        socket.on('prioritizationEnded', function () {
            component.setState({
                ended: true
            })
        })
    }

    setUpRoom(component) {
        if (socket) {
            component.room = new Room(socket, this.props.roomKey);
            component.BoardApi.getMembers('me', {}, function (data) {
                let normalizedData = component.BoardApi.normalizeData(data);
                component.sortelloId = normalizedData.id;
                component.sortelloAvatar = normalizedData.avatar;
                if (component.sortelloAvatar.includes("null")) {
                    component.sortelloAvatar = '//www.gravatar.com/avatar/' + normalizedData.gravatar + '?s=64&d=identicon'
                }
                component.room.join(component.sortelloId, component.sortelloAvatar);
                component.room.castGetBoardId();
            }, function (e) {
                console.log(e);
            });

            window.addEventListener("beforeunload", (ev) => {
                ev.preventDefault();
                component.room.leave(component.sortelloId)
            });
        }
    }

    handleCardClicked(side) {
        if (!this.state.hasVoted && this.room) {
            this.room.castCardClicked(side, this.sortelloId, this.sortelloAvatar)
        }
        this.setState({
            hasVoted: true,
            selectedSide: side
        })
    }

    renderForbidden () {
        return  <ErrorBoard/>
    }

    renderLoading() {
        return <Loader/>;
    }

    render() {
        if ((this.state.leftCard == null || this.state.rightCard == null) && this.state.hasBoardPermissions === null) {
            return this.renderLoading()
        }

        if (this.state.hasBoardPermissions===false) {
            return this.renderForbidden()
        }

        if (this.state.ended) {
            let url = (params.fw ==="t"? "https://trello.com/b/" +this.state.boardId : this.state.boardId+"#column-" + params.extId)
            return (<PrioritizationEnd
                url = {url} BoardApi = {this.BoardApi} fw={params.fw}/>)
        }
        return (
            <ChoicesView
                roomVoters={this.state.roomVoters}
                leftCard={this.state.leftCard}
                rightCard={this.state.rightCard}
                everybodyVoted={this.state.voters.left.length + this.state.voters.right.length > 0}
                voters={this.state.voters}
                handleAddToBlacklist={null}
                handleCardClicked={this.handleCardClicked}
                handleGoToNextVoting={() => {
                }}
                progress={0}
                selectedSide={this.state.selectedSide}
                role="voter"
            />
        )
    }
}

export default Choices