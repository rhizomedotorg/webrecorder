import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';
import OutsideClick from 'components/OutsideClick';
import { Button, Dropdown, DropdownButton, Form, InputGroup } from 'react-bootstrap';
import { LoaderIcon, SearchIcon, XIcon } from 'components/icons';

import "react-datepicker/dist/react-datepicker.css";
import './style.scss';


const parseQuery = (search) => {
  search = search.trim();
  const filters = search.match(/((is|start|end|session):[a-z0-9-.:]+)/ig) || [];
  const urlFragRX = search.match(/url:((?:https?:\/\/)?(?:www\.)?(?:[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6})?(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*))/i);
  const searchRX = search.match(/(?:(?:(?:is|start|end|session|url):[^ ]+\s?)+\s?)?(.*)/i);
  return {
    filters,
    query: searchRX ? searchRX[1] : '',
    urlFragTxt: urlFragRX ? urlFragRX[1] : '',
  };
};

const dateIsValid = (dt) => {
  return dt instanceof Date && !isNaN(dt);
};

const humanDateFormat = (dt) => {
  if (!dt) return '';
  const s = num => String(num);
  return `${dt.getUTCFullYear()}-${s(dt.getUTCMonth() + 1).padStart(2, '0')}-${s(dt.getUTCDate()).padStart(2, '0')}T${s(dt.getUTCHours()).padStart(2, '0')}:${s(dt.getUTCMinutes()).padStart(2, '0')}`;
};

class SearchBox extends PureComponent {
  static propTypes = {
    collection: PropTypes.object,
    clear: PropTypes.func,
    location: PropTypes.object,
    search: PropTypes.func,
    busy: PropTypes.bool,
    searched: PropTypes.bool,
  };

  static getDerivedStateFromProps(props, state) {
    const modalClosed = !state.options && !state.reset;
    const textChange = state.search !== state.prevSearch && !state.reset;
    const filterValues = {
      includeAll: state.includeAll,
      includeWebpages: state.includeWebpages,
      includeImages: state.includeImages,
      includeAudio: state.includeAudio,
      includeVideo: state.includeVideo,
      includeDocuments: state.includeDocuments,
    };
    const filterFields = {
      includeAll: 'is:any',
      includeWebpages: 'is:page',
      includeImages: 'is:image',
      includeAudio: 'is:audio',
      includeVideo: 'is:video',
      includeDocuments: 'is:document',
    };

    let { date, options, search, searchFrag, urlFrag } = state;
    let { filters, query, urlFragTxt } = parseQuery(search);

    // update query from dropdown search fragment
    if (options && query !== searchFrag) {
      query = searchFrag;
    }

    let searchStruct = '';
    Object.keys(filterValues).forEach((val) => {
      const b = textChange ?
        (
          (state[val] && filters.includes(filterFields[val])) ||
          (!state[val] && filters.includes(filterFields[val]))
        ) : state[val];

      // if new typed flag detected, remove flag from query
      if (!state[val] && filters.includes(filterFields[val])) {
        query = query.replace(filterFields[val], '');
      }

      filterValues[val] = b;
      searchStruct += b ? `${filterFields[val]} ` : '';
    });

    // if no filters set, default to webpage
    const filtersSet = Object.values(filterValues).some(f => !!f);
    if (!filtersSet) {
      filterValues.includeWebpages = true;
    }

    if (urlFrag || (urlFragTxt && textChange)) {
      if (textChange) {
        urlFrag = urlFragTxt;
      }

      if (urlFrag) {
        searchStruct += textChange ? `url:${urlFragTxt} ` : `url:${urlFrag} `;
      }
    }

    // check for date filter changes
    if (textChange && filters.findIndex(f => f.match(/(start|end|session):/)) !== -1 && date === 'anytime') {
      if (filters.findIndex(f => f.match(/(start|end):/)) !== -1) {
        date = 'daterange';
      } else {
        date = 'session';
      }
    } else if(textChange && filters.findIndex(f => f.match(/(start|end|session):/)) === -1 && date !== 'anytime') {
      date = 'anytime';
    }

    if (date === 'daterange') {
      let { startDate, endDate } = state;

      if (textChange) {
        const startStr = filters.find(f => f.match(/^start/i)) || '';
        const newStartDate = startStr.match(/(?:start|end):([a-z0-9-.:]+)/i);
        const endStr = filters.find(f => f.match(/^end/i)) || '';
        const newEndDate = endStr.match(/(?:start|end):([a-z0-9-.:]+)/i);

        if (newStartDate && dateIsValid(new Date(newStartDate[1])) && newStartDate[1] !== humanDateFormat(state.startDate)) {
          startDate = new Date(newStartDate[1]);
          filterValues.startDate = startDate;
        }

        if (newEndDate && dateIsValid(new Date(newEndDate[1])) && newEndDate[1] !== humanDateFormat(state.endDate)) {
          endDate = new Date(newEndDate[1]);
          filterValues.endDate = endDate;
        }
      }

      searchStruct += `start:${humanDateFormat(startDate)} end:${humanDateFormat(endDate)} `;
    } else if (date === 'session') {
      const sessionFilter = filters.find(f => f.match(/^session/i)) || '';
      let sessionReg = sessionFilter.match(/session:(\w+)/i);
      let session = state.session;

      if (textChange && sessionReg && sessionReg[1] !== session) {
        session = sessionReg[1];
        filterValues.session = session;
      }

      if (session) {
        searchStruct += `session:${session} `;
      }
    }

    searchStruct += query;
    let newState = {
      date,
      ...filterValues,
      prevSearch: searchStruct,
      urlFrag,
      reset: false
    };

    if (!modalClosed) {
      newState = {
        ...newState,
        search: searchStruct,
      };
    }

    return newState;
  }

  constructor(props) {
    super(props);

    let includeAll = false;
    let includeWebpages = true;
    let includeImages = false;
    let includeAudio = false;
    let includeVideo = false;
    let includeDocuments = false;
    let session = '';
    let search = '';
    let searchFrag = '';
    let urlFrag = '';
    let date = 'anytime';
    let startDate = new Date();
    let endDate = new Date();
    let urlSearch = false;

    // create clone
    this.initialValues = {
      date,
      endDate,
      includeAll,
      includeWebpages,
      includeImages,
      includeAudio,
      includeVideo,
      includeDocuments,
      search,
      searchFrag,
      session,
      startDate,
      urlFrag,
      urlSearch
    };

    if (props.location.search) {
      const qs = new URLSearchParams(props.location.search);

      if (qs.has('search') || qs.has('url')) {
        props.search(qs.get('user'), qs.get('coll'), qs.get('params'), qs.get('fullText'));
        search = qs.get('search');
        searchFrag = qs.get('search');
        urlFrag = qs.has('url') ? decodeURIComponent(qs.get('url')) : '';
      }

      if (qs.has('mime')) {
        const mime = qs.get('mime');
        includeAll = mime.includes('*');
        includeWebpages = mime.includes('text/html');
        includeImages = mime.includes('image/');
        includeAudio = mime.includes('audio/');
        includeVideo = mime.includes('video/');
        includeDocuments = mime.includes('application/pdf');
      }

      if (qs.has('session')) {
        session = qs.get('session');
        date = 'session';
      }

      if (qs.has('from') || qs.has('to')) {
        startDate = qs.has('from') ? this.parseDate(qs.get('from')) : startDate;
        endDate = qs.has('to') ? this.parseDate(qs.get('to')) : endDate;
        date = 'daterange';
      }

      if (qs.get('method') === 'url') {
        urlSearch = true;
      }
    }

    this.state = {
      date,
      endDate,
      options: false,
      includeAll,
      includeWebpages,
      includeImages,
      includeAudio,
      includeVideo,
      includeDocuments,
      reset: true, // reset first render
      search,
      searchStruct: '',
      session,
      startDate,
      urlFrag,
      urlSearch
    };

    if (props.location.search) {
      this.search();
    }

    this.labels = {
      anytime: 'Anytime',
      daterange: 'Between specific dates',
      session: 'During a specific capture session'
    };
  }

  componentDidUpdate(prevProps, prevState) {
    // check for searched prop being cleared
    if (prevProps.searched && !this.props.searched) {
      this.setState({ search: 'is:page ', searchFrag: '', urlFrag: '' });
    }
  }

  warcDateFormat = (dt) => {
    const s = num => String(num);
    return `${dt.getUTCFullYear()}${s(dt.getUTCMonth() + 1).padStart(2, '0')}${s(dt.getUTCDate()).padStart(2, '0')}${s(dt.getUTCHours()).padStart(2, '0')}${s(dt.getUTCMinutes()).padStart(2, '0')}`;
  }

  parseDate = (d) => {
    const m = d.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?/);
    return new Date(Date.UTC(m[1], (m[2] - 1), m[3], m[4], m[5], m[6] || 0));
  }

  changeTimeframe = (evtKey, evt) => {
    this.setState({ date: evtKey });
  }

  keyUp = (evt) => {
    if (evt.keyCode === 13) {
      this.search();
    }
  }

  handleChange = (evt) => {
    // noop while indexing
    if (this.props.busy) {
      return;
    }

    if (evt.target.type === 'checkbox') {
      if (evt.target.name === 'includeAll') {
        this.setState({
          includeAll: true,
          includeWebpages: false,
          includeImages: false,
          includeAudio: false,
          includeVideo: false,
          includeDocuments: false
        });
      } else if (evt.target.name in this.state) {
        this.setState({ [evt.target.name]: !this.state[evt.target.name], includeAll: false });
      } else {
        this.setState({ [evt.target.name]: true, includeAll: false });
      }
    } else {
      this.setState({
        [evt.target.name]: evt.target.value
      });
    }
  }

  clear = (evt) => {
    const { collection } = this.props;
    evt.stopPropagation();

    window.history.replaceState({}, '', '?search=');
    this.reset()
    this.props.clear(collection.get('owner'), collection.get('id'));
  }

  reset = () => {
    this.setState({ ...this.initialValues, reset: true });
  }

  search = () => {
    const { collection } = this.props;
    const {
      date,
      endDate,
      includeAll,
      includeAudio,
      includeDocuments,
      includeImages,
      includeVideo,
      includeWebpages,
      search,
      session,
      startDate,
      urlFrag,
      urlSearch
    } = this.state;

    const { query } = parseQuery(search);

    const mime = (includeAll ? '*,' : '') +
                 (includeWebpages ? 'text/html,' : '') +
                 (includeImages ? 'image/*,' : '') +
                 (includeAudio ? 'audio/*,' : '') +
                 (includeVideo ? 'video/*,' : '') +
                 (includeDocuments ? 'application/pdf' : '');

    let dateFilter = {};

    if (date === 'daterange') {
      dateFilter = {
        from: this.warcDateFormat(startDate),
        to: this.warcDateFormat(endDate)
      };
    } else if (date === 'session') {
      dateFilter.session = session;
    }

    const urlQuery = {};
    if (urlFrag) {
      urlQuery.url = encodeURIComponent(urlFrag);
    }

    const searchParams = {
      search: query,
      mime,
      ...urlQuery,
      ...dateFilter
    };

    if (typeof window !== "undefined") {
      const querystring = new URLSearchParams(searchParams);
      window.history.replaceState({}, '', `?${querystring.toString()}`);
    }

    this.props.search(
      collection.get('owner'),
      collection.get('id'),
      searchParams,
      collection.get('autoindexed') && !urlSearch
    );

    // close adv search
    if (this.state.options) {
      this.setState({ options: false });
    }
  }

  selectSession = session => this.setState({ session })

  setEndDate = d => this.setState({ endDate: d })

  setStartDate = d => this.setState({ startDate: d })

  toggleAdvancedSearch = () => {
    const { query } = parseQuery(this.state.search);
    this.setState({ options: !this.state.options, searchFrag: query });
  }

  render() {
    const { busy, collection, searched } = this.props;
    const { date } = this.state;
    const busyAction = searched ? 'Searching...' : 'Indexing collection...';
    const inputTitle = busy ? busyAction : 'Search';

    return (
      <div className="search-box">
        <InputGroup title={inputTitle}>
          <InputGroup.Prepend>
            <InputGroup.Text>
              <SearchIcon />
            </InputGroup.Text>
          </InputGroup.Prepend>
          <Form.Control aria-label="filter" onKeyUp={this.keyUp} onChange={this.handleChange} name="search" value={this.state.search} autoComplete="off" placeholder="Filter" />
          <InputGroup.Append>
            {
              (busy || searched) &&
              <React.Fragment>
                {
                  busy ?
                    <LoaderIcon /> :
                    <Button variant="link" onClick={this.clear}><XIcon /></Button>
                }
              </React.Fragment>
            }
            <Button variant="link" onClick={this.toggleAdvancedSearch}><span className="caret" /></Button>
          </InputGroup.Append>
        </InputGroup>

        {
          this.state.options &&
            <OutsideClick handleClick={this.toggleAdvancedSearch}>
              <section className="adv-search-filters">
                <Form.Label htmlFor="searchFrag" className="label">Contains the words</Form.Label>
                <Form.Control type="text" id="searchFrag" name="searchFrag" value={this.state.searchFrag} onKeyUp={this.keyUp} onChange={this.handleChange} />

                <Form.Label htmlFor="urlFrag" className="label">URL contains</Form.Label>
                <Form.Control type="text" id="urlFrag" name="urlFrag" value={this.state.urlFrag} onKeyUp={this.keyUp} onChange={this.handleChange} />

                <div className="label">Include File Types</div>
                <ul>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeAll" name="includeAll" checked={this.state.includeAll} label="All" /></li>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeWebpages" name="includeWebpages" checked={this.state.includeWebpages} label="Webpages" /></li>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeImages" name="includeImages" checked={this.state.includeImages} label="Images" /></li>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeAudio" name="includeAudio" checked={this.state.includeAudio} label="Audio" /></li>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeVideo" name="includeVideo" checked={this.state.includeVideo} label="Video" /></li>
                  <li><Form.Check type="checkbox" onChange={this.handleChange} id="includeDocuments" name="includeDocuments" checked={this.state.includeDocuments} label="Documents (.pdf, .doc, .pptx, etc.)" /></li>
                </ul>
                <div className="label date-filter">Date Archived</div>
                <div>
                  <DropdownButton variant="outline-secondary" id="time-filter" title={this.labels[date]} onSelect={this.changeTimeframe}>
                    {
                      Object.keys(this.labels).map(k => <Dropdown.Item key={k} eventKey={k} active={date === k}>{this.labels[k]}</Dropdown.Item>)
                    }
                  </DropdownButton>
                  {
                    date === 'daterange' &&
                      <div className="date-select">
                        <div className="start-date">
                          <div className="label">From</div>
                          <DatePicker
                            selected={this.state.startDate}
                            onChange={this.setStartDate}
                            shouldCloseOnSelect={false}
                            className="form-control" />
                          <DatePicker
                            selected={this.state.startDate}
                            onChange={this.setStartDate}
                            showTimeSelect
                            showTimeSelectOnly
                            shouldCloseOnSelect={false}
                            timeIntervals={15}
                            timeCaption="Time"
                            dateFormat="h:mm aa"
                            className="form-control" />
                        </div>
                        <div className="end-date">
                          <div className="label">To</div>
                          <DatePicker
                            selected={this.state.endDate}
                            onChange={this.setEndDate}
                            shouldCloseOnSelect={false}
                            className="form-control" />
                          <DatePicker
                            selected={this.state.endDate}
                            onChange={this.setEndDate}
                            showTimeSelect
                            showTimeSelectOnly
                            timeIntervals={15}
                            timeCaption="Time"
                            shouldCloseOnSelect={false}
                            dateFormat="h:mm aa"
                            className="form-control" />
                        </div>
                      </div>
                  }
                  {
                    date === 'session' &&
                      <DropdownButton variant="outline-secondary" id="session-filter" title={this.state.session ? this.state.session : "Select a session"} onSelect={this.selectSession}>
                        {
                          collection.get('recordings').map(rec => <Dropdown.Item key={rec.get('id')} eventKey={rec.get('id')} active={this.state.session === rec.get('id')}>{rec.get('id')}</Dropdown.Item>)
                        }
                      </DropdownButton>
                  }
                </div>
                <div className="actions">
                  <Button variant="outline-secondary" onClick={this.reset}>Reset to Defaults</Button>
                  <Button variant="primary" onClick={this.search}>Search</Button>
                </div>
              </section>
            </OutsideClick>
        }
      </div>
    );
  }
}


export default SearchBox;
