import { apiPath } from 'config';
import { fromJS } from 'immutable';

import { defaultSort } from 'config';

const BK_COUNT = 'wr/coll/BK_COUNT';
const BK_COUNT_SUCCESS = 'wr/coll/BK_COUNT_SUCCESS';
const BK_COUNT_FAIL = 'wr/coll/BK_COUNT_FAIL';

const COLL_INDEX = 'wr/coll/COLL_INDEX';
const COLL_INDEX_SUCCESS = 'wr/coll/COLL_INDEX_SUCCESS';
const COLL_INDEX_FAIL = 'wr/coll/COLL_INDEX_FAIL';

const COLL_MAKE_PRIVATE = 'wr/coll/COLL_MAKE_PRIVATE';
const COLL_MAKE_PRIVATE_SUCCESS = 'wr/coll/COLL_MAKE_PRIVATE_SUCCESS';
const COLL_MAKE_PRIVATE_FAIL = 'wr/coll/COLL_MAKE_PRIVATE_FAIL';

const COLL_LOAD = 'wr/coll/COLL_LOAD';
const COLL_LOAD_SUCCESS = 'wr/coll/COLL_LOAD_SUCCESS';
const COLL_LOAD_FAIL = 'wr/coll/COLL_LOAD_FAIL';

const COLL_LOAD_META = 'wr/coll/COLL_LOAD_META';
const COLL_LOAD_META_SUCCESS = 'wr/coll/COLL_LOAD_META_SUCCESS';
const COLL_LOAD_META_FAIL = 'wr/coll/COLL_LOAD_META_FAIL';

const COLL_EDIT = 'wr/coll/COLL_EDIT';
const COLL_EDIT_SUCCESS = 'wr/coll/COLL_EDIT_SUCCESS';
const COLL_EDIT_FAIL = 'wr/coll/COLL_EDIT_FAIL';
const RESET_EDIT_STATE = 'wr/coll/RESET_EDIT_STATE';

const COLL_SET_SORT = 'wr/coll/COLL_SET_SORT';
const COLL_SET_PUBLIC = 'wr/coll/SET_PUBLIC';
const COLL_SET_PUBLIC_SUCCESS = 'wr/coll/SET_PUBLIC_SUCCESS';
const COLL_SET_PUBLIC_FAIL = 'wr/coll/SET_PUBLIC_FAIL';

const DAT_SHARE = 'wr/coll/DAT_SHARE';
const DAT_SHARE_SUCCESS = 'wr/coll/DAT_SHARE_SUCCESS';
const DAT_SHARE_FAIL = 'wr/coll/DAT_SHARE_FAIL';
const DAT_UNSHARE = 'wr/coll/DAT_UNSHARE';
const DAT_UNSHARE_SUCCESS = 'wr/coll/DAT_UNSHARE_SUCCESS';
const DAT_UNSHARE_FAIL = 'wr/coll/DAT_UNSHARE_FAIL';

const COLL_DELETE = 'wr/coll/COLL_DELETE';
const COLL_DELETE_SUCCESS = 'wr/coll/COLL_DELETE_SUCCESS';
const COLL_DELETE_FAIL = 'wr/coll/COLL_DELETE_FAIL';

const LISTS_LOAD = 'wr/coll/LISTS_LOAD';
const LISTS_LOAD_SUCCESS = 'wr/coll/LISTS_LOAD_SUCCESS';
const LISTS_LOAD_FAIL = 'wr/coll/LISTS_LOAD_FAIL';

const LISTS_REORDER = 'wr/coll/LISTS_REORDER';
const LISTS_REORDER_SUCCESS = 'wr/coll/LISTS_REORDER_SUCCESS';
const LISTS_REORDER_FAIL = 'wr/coll/LISTS_REORDER_FAIL';

const SEARCH = 'wr/coll/SEARCH';
const SEARCH_SUCCESS = 'wr/coll/SEARCH_SUCCESS';
const SEARCH_FAIL = 'wr/coll/SEARCH_FAIL';
const CLEAR_SEARCH = 'wr/coll/CLEAR_SEARCH';
const CLEAR_INDEXING = 'wr/coll/CLEAR_INDEXING';

const initialState = fromJS({
  editing: false,
  datProcessing: false,
  datError: null,
  edited: false,
  editError: null,
  error: null,
  loading: false,
  loaded: false,
  searching: false,
  searched: false,
  sortBy: defaultSort
});


export default function collection(state = initialState, action = {}) {
  switch (action.type) {
    case BK_COUNT_SUCCESS: {
      const idx = state.get('lists').findIndex(l => l.get('id') === action.list);
      return state.setIn(['lists', idx, 'total_bookmarks'], action.result.list.total_bookmarks);
    }
    case COLL_DELETE:
      return state.merge({
        edited: false,
        editing: true,
        editError: null
      });
    case COLL_DELETE_SUCCESS:
      return state.merge({
        edited: true,
        editing: false
      });
    case COLL_DELETE_FAIL:
      return state.merge({
        edited: false,
        editing: false,
        editError: action.error.error
      });
    case COLL_EDIT:
      return state.set('editing', true);
    case COLL_LOAD:
      return state.set('loading', true);
    case COLL_LOAD_META_SUCCESS: {
      const {
        collection: {
          autoindexed,
          created_at,
          desc,
          duration,
          id,
          indexing,
          owner,
          public_index,
          size,
          slug,
          timespan,
          title,
          updated_at
        }
      } = action.result;
      return state.merge({
        autoindexed,
        created_at,
        desc,
        duration,
        id,
        indexing,
        owner,
        public_index,
        size,
        slug,
        timespan,
        title,
        updated_at
      });
    }
    case COLL_EDIT_SUCCESS:
    case COLL_LOAD_SUCCESS: {
      const {
        collection: {
          autoindexed,
          created_at,
          dat_updated_at,
          dat_key,
          dat_share,
          desc,
          duration,
          featured_list,
          id,
          indexing,
          lists,
          owner,
          pages,
          public_index,
          recordings,
          size,
          slug,
          slug_matched,
          timespan,
          title,
          updated_at
        }
      } = action.result;

      let editState = {};
      if (action.type === COLL_EDIT_SUCCESS) {
        editState = {
          editing: false,
          edited: true,
          editError: null,
          slug_matched: true
        };
      }

      return state.merge({
        loading: false,
        loaded: true,
        accessed: action.accessed,
        error: null,
        pages: fromJS(pages),
        autoindexed,
        created_at,
        dat_updated_at,
        dat_key,
        dat_share,
        desc,
        duration,
        id,
        indexing,
        featured_list,
        'public': action.result.collection.public,
        public_index,
        lists: fromJS(lists),
        owner,
        recordings: fromJS(recordings),
        searching: false,
        searched: false,
        size,
        slug,
        slug_matched,
        timespan,
        title,
        updated_at,

        ...editState
      });
    }
    case COLL_LOAD_FAIL:
      return state.merge({
        loading: false,
        loaded: false,
        error: action.error
      });
    case COLL_SET_PUBLIC_SUCCESS:
      return state.set('public', action.result.is_public);

    case COLL_SET_SORT:
      return state.merge({
        sortBy: action.sortBy
      });
    case DAT_SHARE:
      return state.set('datProcessing', true);
    case DAT_SHARE_SUCCESS:
      return state.merge({
        datProcessing: false,
        ...action.result
      });
    case DAT_SHARE_FAIL:
      return state.merge({
        datProcessing: false,
        datError: action.error
      });
    case DAT_UNSHARE:
      return state.set('datProcessing', true);
    case DAT_UNSHARE_SUCCESS:
      return state.merge({
        datProcessing: false,
        dat_share: false
      });
    case LISTS_LOAD_SUCCESS:
      return state.merge({
        lists: fromJS(action.result.lists)
      });
    case LISTS_REORDER_SUCCESS:
      return state.set(
        'lists',
        state.get('lists').sort((a, b) => {
          const aidx = action.order.indexOf(a.get('id'));
          const bidx = action.order.indexOf(b.get('id'));

          if (aidx < bidx) return -1;
          if (aidx > bidx) return 1;
          return 0;
        })
      );
    case COLL_EDIT_FAIL:
      return state.merge({
        editError: action.error.error
      });
    case RESET_EDIT_STATE:
      return state.set('edited', false);

    case SEARCH:
      return state.merge({
        searching: true,
      });
    case SEARCH_SUCCESS:
      return state.merge({
        pages: fromJS(action.result.results),
        searching: false,
        searched: true
      });
    case SEARCH_FAIL:
      return state.set('searching', false);
    case CLEAR_SEARCH:
      return state.merge({
        searching: false,
        searched: false,
      });
    case CLEAR_INDEXING:
      return state.merge({
        indexing: false
      });

    case LISTS_LOAD_FAIL:
    case LISTS_LOAD:
    case COLL_SET_PUBLIC:
    case COLL_SET_PUBLIC_FAIL:
    default:
      return state;
  }
}


export function deleteCollection(user, coll) {
  return {
    types: [COLL_DELETE, COLL_DELETE_SUCCESS, COLL_DELETE_FAIL],
    promise: client => client.del(`${apiPath}/collection/${coll}`, {
      params: { user }
    })
  };
}


export function edit(user, coll, data) {
  return {
    types: [COLL_EDIT, COLL_EDIT_SUCCESS, COLL_EDIT_FAIL],
    promise: client => client.post(`${apiPath}/collection/${coll}`, {
      params: { user },
      data
    }),
    data
  };
}


export function getBookmarkCount(user, coll, list) {
  return {
    types: [BK_COUNT, BK_COUNT_SUCCESS, BK_COUNT_FAIL],
    list,
    promise: client => client.get(`${apiPath}/list/${list}`, {
      params: { user, coll: decodeURIComponent(coll), include_bookmarks: 'none' }
    })
  };
}


export function indexCollection(user, coll, include_existing) {
  return {
    types: [COLL_INDEX, COLL_INDEX_SUCCESS, COLL_INDEX_FAIL],
    promise: client => client.post(`${apiPath}/collection/${coll}/generate_derivs`, {
      params: { user, include_existing }
    })
  };
}


export function isLoaded({ app }) {
  return app.get('collection') &&
         app.getIn(['collection', 'loaded']) &&
         Date.now() - app.getIn(['collection', 'accessed']) < 15 * 60 * 1000;
}


export function makeCollectionPrivate(username, collection) {
  return {
    types: [COLL_MAKE_PRIVATE, COLL_MAKE_PRIVATE, COLL_MAKE_PRIVATE],
    promise: client => client.put(`${apiPath}/admin/make-private/${username}/${collection}`)
  };
}


export function loadMetadata(user, coll, host = '') {
  return {
    types: [COLL_LOAD_META, COLL_LOAD_META_SUCCESS, COLL_LOAD_META_FAIL],
    accessed: Date.now(),
    promise: client => client.get(`${host}${apiPath}/collection/${coll}`, {
      params: { user, shallow: true }
    })
  };
}


export function load(user, coll, host = '') {
  return {
    types: [COLL_LOAD, COLL_LOAD_SUCCESS, COLL_LOAD_FAIL],
    accessed: Date.now(),
    promise: client => client.get(`${host}${apiPath}/collection/${coll}`, {
      params: { user }
    })
  };
}


/**
 * withBookmarks accepts `first` or `all` for `include_bookmarks` query prop
 */
export function loadLists(user, coll, withBookmarks = 'first', host = '') {
  return {
    types: [LISTS_LOAD, LISTS_LOAD_SUCCESS, LISTS_LOAD_FAIL],
    promise: client => client.get(`${host}${apiPath}/lists`, {
      params: { user, coll: decodeURIComponent(coll), include_bookmarks: withBookmarks }
    })
  };
}


export function resetEditState() {
  return { type: RESET_EDIT_STATE };
}


export function clearSearch() {
  return { type: CLEAR_SEARCH };
}


export function clearIndexing() {
  return { type: CLEAR_INDEXING };
}


export function search(user, coll, searchParams, fullText = false) {
  return {
    types: [SEARCH, SEARCH_SUCCESS, SEARCH_FAIL],
    promise: client => client.get(`${apiPath}/${fullText ? 'text' : 'url'}_search`, {
      params: {
        user,
        coll,
        ...searchParams
      }
    })
  };
}


export function setSort(sortBy) {
  return {
    type: COLL_SET_SORT,
    sortBy
  };
}


export function shareToDat(user, coll) {
  return {
    types: [DAT_SHARE, DAT_SHARE_SUCCESS, DAT_SHARE_FAIL],
    promise: client => client.post(`${apiPath}/collection/${coll}/dat/share`, {
      params: { user }
    })
  };
}


export function sortLists(user, coll, order) {
  return {
    types: [LISTS_REORDER, LISTS_REORDER_SUCCESS, LISTS_REORDER_FAIL],
    order,
    promise: client => client.post(`${apiPath}/lists/reorder`, {
      params: { user, coll: decodeURIComponent(coll) },
      data: {
        order
      }
    })
  };
}


export function unshareFromDat(user, coll) {
  return {
    types: [DAT_UNSHARE, DAT_UNSHARE_SUCCESS, DAT_UNSHARE_FAIL],
    promise: client => client.post(`${apiPath}/collection/${coll}/dat/unshare`, {
      params: { user }
    })
  };
}
