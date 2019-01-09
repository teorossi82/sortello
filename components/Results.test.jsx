import React from "react";
import {shallow} from 'enzyme';
import Results from "./Results";
import TrelloApi from "../Api/TrelloApi"
import GithubApi from "../Api/GithubApi"

describe("Results", () => {
    let props = {
        BoardApi: null,
        startTimeStamp: null,
        fromExtension: null,
        extId: null,
        rootNode: null
    };

    it("use trello and visualize 'Prioritize another list' button", () => {
        props.BoardApi = new TrelloApi();
        let wrapper = shallow(<Results {...props}/>)
        wrapper.instance().renderUploadDone = jest.fn();
        expect(wrapper.instance().renderPrioritizeAnotherListButton()).toBeTruthy();
    });

    it("use github and don't visualize 'Prioritize another list' button", () => {
        props.BoardApi = new GithubApi();
        let wrapper = shallow(<Results {...props}/>)
        wrapper.instance().renderUploadDone = jest.fn();
        expect(wrapper.instance().renderPrioritizeAnotherListButton()).not.toBeTruthy();
    });


});