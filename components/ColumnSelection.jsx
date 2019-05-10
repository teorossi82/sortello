import React from "react"
import {find} from "lodash"
import Header from './Header.jsx';
import BoardSelector from './BoardSelector.jsx'
import ListSelector from './ListSelector.jsx'
import LabelSelector from './LabelSelector.jsx'
import Footer from "./Footer.jsx";
import ErrorBoard from './ErrorBoard.jsx';
import ProceedButton from "./ProceedButton.jsx";
import queryString from "query-string";
import Loader from "./Loader.jsx";

const params = queryString.parse(location.search);

class ColumnSelection extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            boards: [],
            lists: [],
            listCards : [],
            labels: [],
            groupedboards: [],
            organizations: [],
            noCardsError: false,
            boardId: null,
            hasBoardPermissions: null,
            hasNotEnoughCard: false,
            selectedLabel: null,
            selectedList: false,
            username: ""
        };
        this.getBoardColumns = this.getBoardColumns.bind(this);
        this.setSelectedLabel = this.setSelectedLabel.bind(this);
        this.retrieveCardsByListId = this.retrieveCardsByListId.bind(this);
        this.handleBoardClicked = this.handleBoardClicked.bind(this);
        this.handleListClicked = this.handleListClicked.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.handleProceedButtonClicked = this.handleProceedButtonClicked.bind(this);
        this.labelSelected = this.labelSelected.bind(this);
        this.getBoards = this.getBoards.bind(this);
        this.renderForbidden = this.renderForbidden.bind(this);
        this.handleLabelClicked = this.handleLabelClicked.bind(this);
    }

    componentDidMount () {
        let component = this;
        if(params.extId === "error"){
            component.setState({
                hasNotEnoughCard : true
            });
        }
        let BoardApi = this.props.BoardApi;
        localStorage.removeItem("extId");
        localStorage.removeItem("fromExtension");
        if (component.props.fromExtension !== null) {
            if (component.props.BoardApi.getName() !== "Github") {
                BoardApi.getCardById(component.props.extId, null, function (card) {
                    component.retrieveCardsByListId(card.idList)
                }, function () {
                    component.setState({
                        hasBoardPermissions: false
                    })
                })
            } else {
                component.props.BoardApi.checkPermissions(component.props.extId).then(function(res){
                    component.retrieveCardsByListId(component.props.extId)
                }, function () {
                    component.setState({
                        hasBoardPermissions: false
                    })
                })
            }
        }else{
            this.props.BoardApi.getMembers('me', function (data) {
                let username = data.username;
                component.setState({
                    username: username
                })
            }, function (e) {
                console.log("error username");
            });
        }

        if (this.state.organizations.length > 0) {
            return;
        }


        this.getBoards()
    }

    setSelectedLabel(value){
        this.setState({
            selectedLabel: value
        })
    }

    getBoards () {
        let component = this;
        let BoardApi = this.props.BoardApi;
        BoardApi.getMembers('me', {
            organizations: "all",
            organization_fields: "all",
            boards: "open",
            board_lists: "open"
        }, function (data) {
            let boardGroups = [];
            let boards = data.boards;
            let organizations = data.organizations;
            for (let i = 0; i < boards.length; i++) {
                let organization = find(organizations, { 'id': boards[i].idOrganization });
                let groupName = "Other";
                if (organization !== undefined) {
                    groupName = organization.displayName;
                }
                if (!boardGroups[groupName]) {
                    boardGroups[groupName] = [];
                }
                boardGroups[groupName].push(boards[i]);
            }
            component.setState({
                boards: boards,
                groupedboards: boardGroups,
                organizations: organizations
            })
        }, function (e) {
            console.log(e);
        });
    }

    labelSelected (labelId, cb) {
        this.setState({selectedLabel: labelId},function(){
            cb();
        })
    }

    retrieveCardsByListId(listId) {
        let that = this;
        let labels = [];
        this.props.BoardApi.getCardsByListId(listId, {cards: "open"}, function (data,html_url) {
            let listCards = data;
            that.setState({
                listCards: listCards,
                selectedList : true
            });
            // Display an error message if current list contains no cards
            if (listCards.length === 0) {
                that.setState({
                    labels: [],
                    noCardsError: true
                })
            } else {
                listCards.forEach(function (card) {
                    card.labels.forEach(function (label) {
                        if (find(labels, { 'id': label.id }) === undefined) {
                            labels.push(label);
                        }
                    });
                });
                that.setState({
                    labels: labels,
                    boardId: data[0].idBoard
                }, function () {
                    that.props.setUrl(html_url);
                    if(that.props.fromExtension !== null) {
                        that.clickProceedButtonIfLabelsAreZero();
                    }
                });
            }
        }, function (e) {
            console.log(e);
        });
    }

    clickProceedButtonIfLabelsAreZero(){
        let that=this;
        if(that.state.labels.length === 0){
            that.labelSelected(0,function(){
                that.handleProceedButtonClicked();
            });
        }
    }

    getBoardColumns(board) {
        if(board===undefined){
            this.setState({
                lists: [],
                selectedLabel: null
            });
        }else{
            this.setState({
                lists: board.lists
            });
        }
    }

    handleBoardClicked(boardElement) {
        this.setState({
            boardId: boardElement.value,
            labels: [],
            noCardsError: false,
            selectedList: 0,
            selectedLabel: null,
            lists : [],
        },function(){
            let board = find(this.state.boards, { 'id': boardElement.value });
            this.getBoardColumns(board)
        });
    }

    handleListClicked(listElement) {
        this.setState({
            noCardsError: false,
            selectedList: false,
            selectedLabel: null,
        });

        // If list does not exist, reset all labels (it means we have clicked the 'Select List' entry)
        let list = find(this.state.lists, { 'id': listElement.value });
        if (list) {
            this.retrieveCardsByListId(list.id);
        } else {
            this.setState({
                labels: [],
                selectedLabel: null
            })
        }
    }

    handleLabelClicked (labelElement) {
        this.labelSelected(labelElement.value, () => {})
    }

    handleProceedButtonClicked (){
        let labelId = this.state.selectedLabel.id;
        let listCards = this.state.listCards;
        if (labelId !== 0 && labelId !== '0') {
            labelId = this.props.BoardApi.getShortenedExtension() === "g"? parseInt(labelId):labelId;
            let label = find(this.state.labels, {'id': labelId});
            listCards = _.filter(this.state.listCards, function (card) {
                return find(card.labels, {'id': label.id}) !== undefined;
            });
        }
        if(listCards.length<2){
            this.setState({
                hasNotEnoughCard : true,
            })
        }else{
            this.props.handleCards(listCards, this.state.boardId);
        }
    }


    renderForbidden(){
        return (
            <div>
                <ErrorBoard text="You have no access to this board, please contact
                        board's administrator to gain access."/>
            </div>
        )
    }

    renderNotEnoughCard(){
        return (
            <div>
                <ErrorBoard text={"Your list seems to have 0 or 1 card, please fill the list with more cards."} message={true}/>
            </div>
        )
    }

    renderBoardSelector () {
        if (this.props.fromExtension !== null) {
            return ""
        }
        return <BoardSelector groupedboards={this.state.groupedboards}
                              onChange={this.handleBoardClicked} />
    }

    renderListSelector () {
        if (this.state.lists.length === 0 || this.props.fromExtension !== null) {
            return ""
        }
        return <ListSelector lists={this.state.lists}
            onChange={this.handleListClicked} />
    }


    renderLabelSelector() {
        if (!this.state.selectedList) {
            return ""
        }
        return <LabelSelector BoardApi={this.props.BoardApi} selectedLabel={this.state.selectedLabel} labels={this.state.labels}
                              currentView = {this.props.currentView} setSelectedLabel={this.setSelectedLabel}/>
    }

    renderProceedButton () {
        if (this.state.selectedLabel === null) {
            return ""
        }
        return <ProceedButton onClick={this.handleProceedButtonClicked} />
    }

    render() {
        if(this.state.hasNotEnoughCard === true){
            return this.renderNotEnoughCard();
        }

        if (this.state.hasBoardPermissions === false) {
            return this.renderForbidden();
        }

        return (
            <div id="card_url_div">
                <div className="selection__wrapper">
                    <div>
                        <div className="selection__heading">
                            {
                                (this.props.fromExtension !== null) ?
                                    (!this.state.selectedList)?
                                        <Loader/>:
                                        "Filter by label, or select All"
                                    :`Welcome to sortello, ${this.state.username}`

                            }
                        </div>
                        <div className="selection__container selection__container--animation">
                            {this.renderBoardSelector()}
                            {this.renderListSelector()}
                            {this.renderLabelSelector()}
                            {this.renderProceedButton()}
                            {
                                (this.state.noCardsError === true) ?
                                    "There are no cards for the selected list! Try choosing another one" :
                                    ""
                            }
                        </div>
                    </div>
                    <div className={"footer footer--animated"}>
                        <Header/>
                        <Footer/>
                    </div>
                </div>
            </div>
        )
    }
}

export default ColumnSelection
