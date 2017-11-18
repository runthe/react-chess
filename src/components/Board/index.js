import React, { Component } from 'react'
import PropTypes from 'prop-types'
import cx from 'classnames'
import { File, Turn, Pawn, Rook, Bishop, Knight, Queen, King } from '@components'
import { Chess, flatten } from '@utils'
import { NOTATIONS, RANKS, FILES } from '@constants'
import css from './board.css'

/**
 * Chess Board component
 * @extends {React.Component}
 */
class Board extends Component {
  static propTypes = {
    notations: PropTypes.array
  }

  static defaultProps = {
    notations: NOTATIONS
  }

  /**
   * GRID
   * @param {Object} props
   */
  constructor (props) {
    super(props)

    this.state = {
      notations: props.notations,
      turn: 'w',
      movable: [],
      selected: ''
    }

    // instant data
    // reset per update
    this.translated = null

    this.rAFId = -1
  }

  getPieceComponent (piece) {
    const pieceList = {
      P: Pawn,
      R: Rook,
      B: Bishop,
      N: Knight,
      Q: Queen,
      K: King,
      Pawn,
      Rook,
      Bishop,
      Knight,
      Queen,
      King
    }

    return pieceList[piece]
  }

  /**
   * Get notation with using position
   * @param  {String} position
   * @return {String}
   */
  findNotation (position) {
    const { notations } = this.state

    return notations.find(n => (n.search(position) > -1)) || ''
  }

  /**
   * Is any piece there?
   * @param  {String}  position
   * @return {Boolean}
   */
  isPlaced (position) {
    return !!this.findNotation(position)
  }

  /**
   * Filter blocked path
   * @param  {Object} args
   * @param  {Array}  args.movable
   * @param  {Array}  args.specials
   * @return {Array}
   */
  filterBlockedPath ({ movable, specials }) {
    if (specials.indexOf('jumpover') === -1) {
      movable = movable.map(m => m.map(this.detectBlockedDirection))
    } else {
      movable = movable.map(m => m.map(this.removePlacedTile))
    }

    return movable
  }

  /**
   * Detect blocked direction
   * @param  {Array} direction
   * @return {Array}
   */
  detectBlockedDirection = direction => {
    const removedPlacedTile = direction.map(d => (this.isPlaced(d) ? undefined : d))
    const start = removedPlacedTile.indexOf(undefined)

    // get rid of blocked direction
    start > -1 && removedPlacedTile.fill(undefined, start)

    return removedPlacedTile.filter(ofs => !!ofs)
  }

  /**
   * Remove placed tile
   * @param  {Array} direction
   * @return {Array}
   */
  removePlacedTile = direction => {
    return direction.filter(d => !this.isPlaced(d))
  }

  /**
   * Handle piece movement
   * @param {Object} notation
   */
  handleSelect = ({ side, piece, position }) => {
    // get Piece component
    const Piece = this.getPieceComponent(piece)

    // assigned on each component
    const { movement } = Piece
    const { defaults, specials } = movement

    // undertand movement of Chess piece
    const movable = Chess.calcMovablePath({ movement: defaults, position, side })

    this.setState({
      selected: position,
      movable: this.filterBlockedPath({ movable, specials })
    })
  }

  /**
   * Handle after moving
   * @param {String} position
   */
  handleMove = (position, cb) => {
    const turn = {
      w: 'b',
      b: 'w'
    }

    this.setState(prevState => {
      const { notations, selected } = prevState
      const nextNotations = notations.map(n => {
        let nextNotation = n

        if (n.search(selected) > -1) {
          const { side, piece } = Chess.parseNotation(n)

          nextNotation = `${side}${piece}${position}`

          // passing prop to show moving animation
          // TODO
          // get rid of it if it fires side effect
          // re-implement
          this.translated = {
            notation: nextNotation,
            axis: Chess.calcAxis(n, nextNotation)
          }
        }

        return nextNotation
      })

      return {
        notations: nextNotations,
        turn: turn[prevState.turn],
        selected: '',
        movable: []
      }
    })
  }

  /**
   * Moving animation
   * @param {Object} axis
   * @param {Object} el
   */
  handleAnimate = (axis, el) => {
    const pretendMoving = () => (el.style.cssText = 'top: 0; right: 0;')
    let style = ''

    if (axis.x !== 0) {
      style = `${style}right: ${axis.x}px;`
    }

    if (axis.y !== 0) {
      style = `${style}top: ${axis.y}px;`
    }

    el.style.cssText = style

    if (this.rAFId) {
      window.cancelAnimationFrame(this.rAFId)
    }

    this.rAFId = window.requestAnimationFrame(pretendMoving)
  }

  /**
   * Lifecycle method
   */
  componentDidUpdate () {
    this.translated = null
  }

  /**
   * Lifecycle method
   */
  componentWillUnmount () {
    window.cancelAnimationFrame(this.rAFId)
  }

  /**
   * Lifecycle method
   * @return {JSX}
   */
  render () {
    const { turn, movable, selected } = this.state
    const parsedMovable = flatten(movable)

    return [
      <div key="body" className={css.board}>
        {
          RANKS.map(rank => (
            <div key={rank} className={cx(css.rank, 'l-flex-row')}>
              {
                FILES.map(file => {
                  const position = `${file}${rank}`
                  const currentNotation = this.findNotation(position)
                  const { side, piece } = Chess.parseNotation(currentNotation)
                  const Piece = this.getPieceComponent(piece)
                  const shouldAnimate = (this.translated && this.translated.notation === currentNotation)

                  return (
                    <File
                      key={position}
                      piece={piece}
                      side={side}
                      turn={turn}
                      position={position}
                      selected={selected}
                      movable={parsedMovable}
                      onSelect={this.handleSelect}
                      onMove={this.handleMove}
                    >
                      {
                        /* no use state, no auto render */
                        Piece && <Piece
                          side={side}
                          translated={shouldAnimate && this.translated}
                          doAnimate={shouldAnimate && this.handleAnimate}
                        />
                      }
                    </File>
                  )
                })
              }
            </div>
          ))
        }
      </div>,
      <Turn key="footer" turn={turn} />
    ]
  }
}

export default Board
