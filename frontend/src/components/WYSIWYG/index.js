import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import RichTextEditor, { createValueFromString } from 'react-rte/lib/RichTextEditor';
import ButtonGroup from 'react-rte/lib/ui/ButtonGroup';
import IconButton from 'react-rte/lib/ui/IconButton';
import { Button } from 'react-bootstrap';

import { PencilIcon, XIcon } from 'components/icons';

import './style.scss';


class WYSIWYG extends Component {

  static contextTypes = {
    canAdmin: PropTypes.bool
  };

  static propTypes = {
    active: PropTypes.bool,
    cancel: PropTypes.func,
    className: PropTypes.string,
    clickToEdit: PropTypes.bool,
    contentSync: PropTypes.func,
    editMode: PropTypes.bool,
    externalEditButton: PropTypes.bool,
    initial: PropTypes.string,
    minimal: PropTypes.bool,
    readOnly: PropTypes.bool,
    renderCallback: PropTypes.func,
    onSave: PropTypes.func,
    success: PropTypes.bool,
    toggleCallback: PropTypes.func
  };

  static defaultProps = {
    active: true,
    externalEditButton: false,
    initial: '',
    minimal: true,
    readOnly: false
  };

  constructor(props) {
    super(props);

    const extraElements = ['BLOCK_TYPE_BUTTONS', 'IMAGE_BUTTON', 'HISTORY_BUTTONS'];
    const displayItems = [
      'INLINE_STYLE_BUTTONS',
      'LINK_BUTTONS',
    ];

    if (!props.minimal) {
      displayItems.splice(2, 0, ...extraElements);
    }

    this.method = 'markdown';
    this.editorConf = {
      display: displayItems,
      INLINE_STYLE_BUTTONS: [
        { label: 'Bold', style: 'BOLD', className: 'custom-css-class' },
        { label: 'Italic', style: 'ITALIC' },
        { label: 'Underline', style: 'UNDERLINE' },
        { label: 'Strikethrough', style: 'STRIKETHROUGH' }
      ],
      BLOCK_TYPE_DROPDOWN: [
        { label: 'Normal', style: 'unstyled' },
        { label: 'Large', style: 'header-one' },
        { label: 'Medium', style: 'header-two' },
        { label: 'Small', style: 'header-three' },
        { label: 'Code', style: 'code-block' }
      ],
      BLOCK_TYPE_BUTTONS: [
        { label: 'UL', style: 'unordered-list-item' },
        { label: 'OL', style: 'ordered-list-item' },
        { label: 'Blockquote', style: 'blockquote' }
      ]
    };

    this.state = {
      renderable: false,
      editorState: createValueFromString(this.props.initial, this.method),
      markdownEdit: false,
      localEditMode: false
    };
  }

  componentDidMount() {
    this.setState({ renderable: true });
  }

  componentWillReceiveProps(nextProps) {
    if (!this.props.externalEditButton) {
      // if change in success state from on to off, reset edit mode
      if (this.props.success && !nextProps.success && this.state.localEditMode) {
        this.toggleEditMode();
      }
    }

    // non-save related inital value changed, update editor
    if (this.props.initial !== nextProps.initial && !nextProps.success) {
      if (!this.props.externalEditButton && this.state.localEditMode) {
        this.toggleEditMode();
      }

      this.setState({ editorState: createValueFromString(nextProps.initial, this.method) });
    }
  }

  shouldComponentUpdate() {
    if (this.state.renderable && this.props.readOnly) {
      return false;
    }

    return true;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.renderCallback && this.state.renderable && !prevState.renderable) {
      this.props.renderCallback();
    }
  }

  onChange = (editorState) => {
    const { contentSync } = this.props;
    this.setState({ editorState });

    // send contents to external component
    if (contentSync) {
      contentSync(editorState.toString(this.method));
    }
  }

  onChangeSource = (event) => {
    const { contentSync } = this.props;

    const source = event.target.value;
    const oldValue = this.state.editorState;
    const editorState = oldValue.setContentFromString(source, this.method);
    this.setState({
      editorState,
    });

    // send contents to external component
    if (contentSync) {
      contentSync(editorState.toString(this.method));
    }
  }

  cancel = () => {
    this.setState({
      editorState: createValueFromString(this.props.initial, this.method)
    });

    if (this.props.externalEditButton) {
      this.props.cancel();
    } else {
      this.toggleEditMode();
    }
  }

  save = () => {
    const { onSave } = this.props;
    if (onSave) {
      onSave(this.state.editorState.toString(this.method));
    }
  }

  toggleMarkdownMode = () => this.setState({ markdownEdit: !this.state.markdownEdit })

  toggleEditMode = () => {
    const { toggleCallback } = this.props;
    const { localEditMode } = this.state;

    if (toggleCallback) {
      toggleCallback(!localEditMode);
    }

    this.setState({ localEditMode: !localEditMode });
  }

  render() {
    const { className, clickToEdit, contentSync, editMode, externalEditButton, readOnly } = this.props;
    const { editorState, localEditMode, renderable } = this.state;
    const canAdmin = typeof this.context.canAdmin !== 'undefined' ? this.context.canAdmin : true;

    const _editMode = externalEditButton ? editMode : localEditMode;

    return (
      <div className={classNames('wr-editor', className, { 'click-to-edit': clickToEdit, open: _editMode })} onClick={canAdmin && !readOnly && clickToEdit ? this.toggleEditMode : undefined}>
        <div>
          {
            renderable &&
              <RichTextEditor
                value={editorState}
                onChange={this.onChange}
                toolbarConfig={this.editorConf}
                className={classNames('wr-editor-instance', { 'read-only': !canAdmin || !_editMode })}
                readOnly={!canAdmin || !_editMode || readOnly}
                customControls={[
                  <ButtonGroup key={2}>
                    <IconButton
                      label="Edit Markdown"
                      iconName="remove-link"
                      focusOnClick={false}
                      className={classNames('markdown-button', { active: this.state.markdownEdit })}
                      onClick={this.toggleMarkdownMode}
                    />
                  </ButtonGroup>
                ]} />
          }
        </div>
        {
          _editMode && !contentSync &&
            <div className="editor-button-row">
              <Button onClick={this.cancel} className="rounded">Cancel</Button>
              <Button bsStyle={this.props.success ? 'success' : 'default'} className="rounded" onClick={this.save}>
                { this.props.success ? 'Saved..' : 'Save' }
              </Button>
            </div>
        }
        {
          _editMode && this.state.markdownEdit &&
            <React.Fragment>
              <button onClick={this.toggleMarkdownMode} className="close-markdown borderless">
                <XIcon />
              </button>
              <textarea
                className={classNames('markdown-editor', { visible: this.state.markdownEdit })}
                onChange={this.onChangeSource}
                value={this.state.editorState.toString(this.method)} />
            </React.Fragment>
        }
        {
          canAdmin && !readOnly && !externalEditButton && !_editMode && !clickToEdit &&
            <div className="toggle-btn-row">
              <Button className="rounded wr-edit-button" onClick={this.toggleEditMode}>edit</Button>
            </div>
        }
        {
          canAdmin && !readOnly && clickToEdit && !_editMode &&
            <div className="click-indicator" onClick={this.toggleEditMode}>
              <PencilIcon />
            </div>
        }
      </div>
    );
  }
}

export default WYSIWYG;
