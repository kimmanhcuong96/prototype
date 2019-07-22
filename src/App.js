import React, { Component } from 'react';
import './App.css';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import KeywordExtractionPage from './pages/KeywordExtractionPage';
import KeywordSelectionPage from './pages/KeywordSelectionPage';
import LoginPage from './pages/LoginPage';
import LearningPage from './pages/LearningPage';
import KnowlegdeIntegratingPage from './pages/KnowledgeIntegratingPage';
import TagSynonyms from './pages/TagSynonyms';


class App extends Component {
  render() {
    return (
      <Router>
        <div>
          <h2>Vortex Demo App</h2>
          <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <ul className="navbar-nav mr-auto">
              <li><Link to={'/'} className="nav-link"> Login </Link></li>
              <li><Link to={'/learning'} className="nav-link"> Learning </Link></li>
              <li><Link to={'/integrating'} className="nav-link"> Integrating </Link></li>
              <li><Link to={'/keyword-extraction'} className="nav-link"> Keyword Extraction </Link></li>
              <li><Link to={'/keyword-selection'} className="nav-link"> Keyword Selection </Link></li>
              <li><Link to={'/tag-synonyms'} className="nav-link"> Tag Synonyms </Link></li>
            </ul>
          </nav>
          <hr />
          <Switch>
            <Route exact path='/' component={LoginPage} />
            <Route path='/learning' component={LearningPage} />
            <Route path='/integrating' component={KnowlegdeIntegratingPage} />
            <Route path='/keyword-extraction' component={KeywordExtractionPage} />
            <Route path='/keyword-selection' component={KeywordSelectionPage} />
            <Route path='/tag-synonyms' component={TagSynonyms} />
          </Switch>
        </div>
      </Router>
    );
  }
}

export default App;
