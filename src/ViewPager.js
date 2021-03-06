import React, { PureComponent } from 'react'
import {
  StyleSheet,
  Dimensions,
  ScrollView,
  View,
} from 'react-native'
import PropTypes from 'prop-types'
import Mirror, { scrollviewBootstrap } from 'react-native-mirror'
import Page from './Page'


const VIEWPORT_WIDTH = Dimensions.get('window').width

class ViewPager extends PureComponent {

  static defaultProps = {
    dev: false,
    log: false,
    thresholdPages: 1,
    renderAsCarousel: true,
    pageWidth: VIEWPORT_WIDTH,
    pagingEnabled: true,
    contentContainerStyle: {},
    renderPage: () => {},
    onPageChange: () => {},
    onScroll: () => {},
    scrollEnabled: true,
    data: [],
    experimentalMirroring: false,
    showNativeScrollIndicator: false,
    lazyrender: false,
    initialPage: {},
  }

  static propTypes = {
    contentContainerStyle: PropTypes.any,
    containerStyle: PropTypes.any,
    data: PropTypes.arrayOf(
      PropTypes.object
    ),
    dev: PropTypes.bool,
    log: PropTypes.bool,
    initialPage: PropTypes.object,
    renderAsCarousel: PropTypes.bool,
    thresholdPages: PropTypes.number,
    pageWidth: PropTypes.number,
    scrollEnabled: PropTypes.bool,
    pagingEnabled: PropTypes.bool,
    experimentalMirroring: PropTypes.bool,
    showNativeScrollIndicator: PropTypes.bool,
    lazyrender: PropTypes.bool,

    renderPage: PropTypes.func,
    onPageChange: PropTypes.func,
    onScroll: PropTypes.func,
  }

  constructor(props) {
    super(props)

    this._pageWithDelta = (VIEWPORT_WIDTH - this.props.pageWidth) / 2

    this.pageReferences = {}
    this.pageNumberBeforeDrag = 1
    this.data = this.props.data || []
    this.pageCount = this.data.length
    this.thresholdPages = 
      this.props.renderAsCarousel && 
      this.pageCount > 1 
        ? this.props.thresholdPages : 0

    this.state = {
      dataSource: [...this._prepareData(this.props.data || [])],
    }
  }

  componentDidMount() {
    if (this.props.renderAsCarousel && Object.keys(this.props.initialPage).length === 0) {
      setTimeout(() => {
        this._scrollTo({
          x: this.props.pageWidth * this.thresholdPages - this._pageWithDelta,
          animated: false,
        })
      }, 0)
    } else {
      setTimeout(() => {
        this.scrollToPageWithKeyValuePair(this.props.initialPage)
      }, 0)
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      dataSource: [...this._prepareData(nextProps.data || [])],
    })
  }

  _setPageNumber = (data) => {
    return data.map((_data, index) => {
      return Object.assign({}, _data, {
        _pageNumber: index + 1,
      })
    })
  }

  _setPageIndex = data => {
    return data.map((_data, index) => {
      return Object.assign({}, _data, {
        _pageIndex: index,
      })
    })
  }

  _prepareData = (data) => {

    const initializedData = this._setPageNumber(data)

    let preparedData = []

    if (this.props.renderAsCarousel) {

      const multiplicator = data.length > 0 ? Math.ceil(this.thresholdPages / data.length) : 0

      let thresholdDataFront = []
      let thresholdDataEnd = []

      for (let i = 0; i < multiplicator; i++) {
        thresholdDataFront = [...thresholdDataFront, ...[...initializedData].reverse()]
        thresholdDataEnd = [...thresholdDataEnd, ...initializedData]
      }

      const thresholdFront = thresholdDataFront.slice(0, this.thresholdPages).reverse()

      const thresholdEnd = thresholdDataEnd.slice(0, this.thresholdPages)

      preparedData = [...thresholdFront, ...initializedData, ...thresholdEnd]

    } else {

      preparedData = [...initializedData]

    }

    preparedData = this._setPageIndex(preparedData)

    return [...preparedData]
  }

  _getPageNumberByIndex = index => {
    const roundedIndex = Math.round(index)
    if (this.props.renderAsCarousel) {
      if (roundedIndex === 0) return this.state.dataSource.length - 1
      if (roundedIndex === this.state.dataSource.length - 1) return 1
    }
    const pageNumber = this.state.dataSource[roundedIndex] ? this.state.dataSource[roundedIndex]._pageNumber : 1
    return pageNumber
  }

  _getPageIndexByKeyValuePair = keyValuePair => {
    const key = Object.keys(keyValuePair)[0]
    const value = keyValuePair[key]
    const pageWithKeyValuePair = this.state.dataSource.find(page => {
      return page[key] && page[key] === value
    })
    let pageIndex = 0
    if (pageWithKeyValuePair) 
      pageIndex = pageWithKeyValuePair._pageIndex
    return pageIndex
  }

  _scrollTo = (options) => {
    if (this.scrollView) {
      this.scrollView.scrollTo(options)
    }
  }

  _onScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x
    this.props.onScroll(offsetX)


    this.pageIndex = Math.ceil(((offsetX + this._pageWithDelta) / this.props.pageWidth) * 100) / 100
  

    if (this.props.renderAsCarousel && this.pageIndex % 1 < 0.03) {
      if (Math.trunc(this.pageIndex) === 0) {

        this._scrollTo({
          animated: false, 
          x: VIEWPORT_WIDTH * (this.state.dataSource.length - 2),
        })

      } else if (Math.trunc(this.pageIndex) === this.state.dataSource.length - 1) {

        this._scrollTo({
          animated: false, 
          x: VIEWPORT_WIDTH,
        })

      } 
    }

    this.pageIndex = Math.round(this.pageIndex)
  }

  _onScrollBeginDrag = () => {
    const pageNumber = this._getPageNumberByIndex(this.pageIndex)
    this.pageNumberBeforeDrag = pageNumber
  }
  
  _onMomentumScrollEnd = () => {
    const pageNumber = this._getPageNumberByIndex(this.pageIndex)
    for (const key in this.pageReferences) {
      if (this.pageReferences[key])
        this.pageReferences[key].onPageChange(pageNumber)
    }
    if (this.pageNumberBeforeDrag !== pageNumber) {
      this.pageNumberBeforeDrag = pageNumber
      this.props.onPageChange(pageNumber)
    }
  }

  _triggerOnMomentumScrollEnd = () => {
    if (this._onMomentumScrollEndTimeout) 
      clearTimeout(this._onMomentumScrollEndTimeout)
    this._onMomentumScrollEndTimeout = setTimeout(() => {
      this._onMomentumScrollEnd()
    }, 500)
  }

  _getScrollEnabled = () => {
    return (
      this.props.scrollEnabled && 
      this.pageCount > 1 &&
      (this.pageCount + this.thresholdPages) * this.props.pageWidth > VIEWPORT_WIDTH
    )
  }

  /*
   * public methods
   */

  scroll = dx => {
    const centerPageDelta = Math.trunc(VIEWPORT_WIDTH / this.props.pageWidth) % 2 === 0 
      ? -(this.props.pageWidth / 2 + this.props.pageWidth * (Math.trunc(VIEWPORT_WIDTH / this.props.pageWidth) / 2 - 1)) 
      : -this.props.pageWidth * (Math.floor(Math.trunc(VIEWPORT_WIDTH / this.props.pageWidth) / 2))
    const thresholdOffset = this.props.renderAsCarousel ? (this.props.pageWidth * this.thresholdPages + centerPageDelta) : 0

    let centeredScrollX = dx / ((VIEWPORT_WIDTH / this.props.pageWidth)) - this.props.pageWidth + thresholdOffset
    const xBiggerThanZero = centeredScrollX > 0
    const xBiggerThanScrollViewWitdh = (centeredScrollX + VIEWPORT_WIDTH) 
      > (this.pageCount + this.thresholdPages) * this.props.pageWidth

    if (!xBiggerThanZero && !this.props.renderAsCarousel)
      centeredScrollX = 0

    if (xBiggerThanScrollViewWitdh && !this.props.renderAsCarousel)
      centeredScrollX = ((this.pageCount + this.thresholdPages) * this.props.pageWidth) - VIEWPORT_WIDTH

    this._scrollTo({
      animated: false, 
      x: centeredScrollX,
    })
  }

  scrollToPage = pageNumber => {
    this._triggerOnMomentumScrollEnd()
    this._scrollTo({
      animated: true, 
      x: ((pageNumber - 1) + this.thresholdPages) * VIEWPORT_WIDTH,
    })
  }

  scrollToPageWithKeyValuePair = keyValuePair => {
    const pageIndex = this._getPageIndexByKeyValuePair(keyValuePair)
    this.scrollToIndex(pageIndex)
  }

  scrollToIndex = pageIndex => {
    this._triggerOnMomentumScrollEnd()
    this._scrollTo({
      animated: true, 
      x: pageIndex * VIEWPORT_WIDTH,
    })
  }

  /*
   * render parts
   */

  _renderPage = (item, index) => {

    let row = (
      <View 
        key={index}
        style={[styles.rowContainer, {
          width: this.props.pageWidth,
        }]}
      >
        {this.props.renderPage({
          data: item, 
          _pageNumber: item._pageNumber,
          _pageIndex: item._pageIndex,
        })}
      </View>
    )

    if (this.props.renderAsCarousel && this.props.experimentalMirroring === true) {
      if (index <= this.thresholdPages) {
        row = (
          <Mirror
            key={index}
            connectionId={'mirror-' + index}
            containerStyle={styles.mirror}
            experimentalComponentDetection={true}
            mirroredProps={[
              scrollviewBootstrap,
            ]}
          >
            {row}
          </Mirror>
        )
      }

      if (index >= this.state.dataSource.length - this.thresholdPages - 1) {
        const idIndex = index - (this.state.dataSource.length - this.thresholdPages - 1)
        row = (
          <Mirror
            key={index}
            connectionId={'mirror-' + idIndex}
            containerStyle={styles.mirror}
            experimentalComponentDetection={true}
            mirroredProps={[
              scrollviewBootstrap,
            ]}
          >
            {row}
          </Mirror>
        )
      }
    }

    return row
  }

  render() {

    this.pageReferences = {}

    return (
      <View 
        style={[styles.container, this.props.containerStyle]}
      > 
        <ScrollView
          ref={(scrollView) => {
            this.scrollView = scrollView
          }}
          onScrollBeginDrag={this._onScrollBeginDrag} 
          onMomentumScrollEnd={this._onMomentumScrollEnd}
          horizontal={true}
          pagingEnabled={this.props.pagingEnabled}
          scrollEnabled={this._getScrollEnabled()}
          showsHorizontalScrollIndicator={this.props.showNativeScrollIndicator}
          showsVerticalScrollIndicator={this.props.showNativeScrollIndicator}
          onScroll={this._onScroll}
          scrollEventThrottle={1}
          contentContainerStyle={[styles.scrollViewContainer, this.props.contentContainerStyle, {
            width: this.props.pageWidth * this.state.dataSource.length,
          }]}>
          {this.state.dataSource.map((item, index) => {
            return (
              <Page
                key={index}
                ref={_page => {
                  this.pageReferences[index] = _page
                }}
                dev={this.props.dev}
                pageNumber={item._pageNumber}
                lazyrender={this.props.lazyrender}
                pageWidth={this.props.pageWidth}
              >
                {this._renderPage(item, index)}
              </Page>
            )
          })}
        </ScrollView>
      </View>
    )
  }
}


const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  scrollViewContainer: {
    flexDirection: 'row',
    /*
     * bug in react-native
     * overflow style has to be set
     * https://github.com/facebook/react-native/issues/12926
     */
    overflow: 'scroll',
  },
  rowContainer: {
    flexGrow: 1,
  },
  mirror: {
    flexGrow: 1,
  },
})


export default ViewPager