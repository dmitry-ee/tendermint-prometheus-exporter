'use strict'

const MetricSet = require('./metric-set')
const Metric = require('./metric')
const logger = require('./logger')
const { keys, isArray, clone } = require('lodash')

let simpleLabelExtractor = (value, metric, label) => {
  let l = {}
  l[label] = value
  metric.set(l, 1, x => 1)
  return false
}

let candidatesExtractor = (candidates, m, fieldToExtract) => {
  if (isArray(candidates)) {

    candidates.forEach(v => {
      if (v[`${fieldToExtract}`] !== undefined)
        m.set({ reward_address : v.reward_address, owner_address: v.owner_address, pub_key: v.pub_key, commission: v.commission, created_at_block: v.created_at_block || -1 }, v[`${fieldToExtract}`], x => parseInt(x))
    })
  }
  return false
}

let netInfoExtractor = (netInfo, m, extractor = x => x) => {
  if (isArray(netInfo)) {

    netInfo.forEach(v => {
      m.set({
        id: v.id, listen_addr: v.listen_addr, moniker: v.moniker, remote_ip: v.remote_ip
      }, v.value, extractor)
    })
  }
  return false
}

const netInfoDefaultLabels = [ 'id', 'listen_addr', 'moniker', 'remote_ip']
const netInfoPathGen = (valuePath) => `result.peers[].{id:node_info.id, listen_addr:node_info.listen_addr, moniker:node_info.moniker, remote_ip:remote_ip, value: ${valuePath}}`
const netInfoPeerPrefix = 'peer_info_connect'
const netInfoPeerMetricGen = (name, help, path, ex, addDate) => {
  return {
    name: `${netInfoPeerPrefix}_${name}`,
    help: help,
    extractPath: netInfoPathGen(path),
    extractPathLib: 'jmespath',
    labelNames: netInfoDefaultLabels,
    addDate: addDate ? true : false,
    extractor: (v, m) => netInfoExtractor(v, m, ex)
  }
}

const metrics = {
  'candidates': [
    {  name: 'info_status',  help: 'Candidate Status',       extractPath: 'result', labelNames: ['reward_address', 'owner_address', 'pub_key', 'commission', 'created_at_block'], extractor: (v, m) => candidatesExtractor(v, m, "status") },
    {  name: 'info_stake',   help: 'Candidate Stake Total',  extractPath: 'result', labelNames: ['reward_address', 'owner_address', 'pub_key', 'commission', 'created_at_block'], extractor: (v, m) => candidatesExtractor(v, m, "total_stake") },
  ],
  'net_info': [
    { name: 'peers_connected_total', help: 'Peers Connected Total', extractPath: 'result.n_peers', metricDataType: Number },
    netInfoPeerMetricGen('is_outbound', 'Connected Peer Is Outbound', 'is_outbound', x => x.toString() == 'true' ? 1 : 0),
    netInfoPeerMetricGen('duration', 'Connected Peer Connect Duration', 'connection_status.Duration', x => parseInt(x)),
    netInfoPeerMetricGen('received_bytes_total', 'Connected Peer Received Bytes Total', 'connection_status.RecvMonitor.Bytes', x => parseInt(x)),
    netInfoPeerMetricGen('sent_bytes_total', 'Connected Peer Sent Bytes Total', 'connection_status.SendMonitor.Bytes', x => parseInt(x)),
    netInfoPeerMetricGen('send_start_time', 'Connected Peer Send Start Time', 'connection_status.SendMonitor.Start', x => new Date(x).getTime() ),
    netInfoPeerMetricGen('receive_start_time', 'Connected Peer Receive Start Time', 'connection_status.SendMonitor.Start', x => new Date(x).getTime() ),
  ],
  'status': [
    { name: 'latest_block_time', help: 'Latest Block Time', extractPath: 'result.latest_block_time', metricDataType: Date, addDate: true },
    { name: 'latest_block_height', help: 'Latest Block Height', extractPath: 'result.latest_block_height', metricDataType: Number },
    { name: 'tm_status_sync_info_latest_block_time', help: 'Node? Latest Block Time', extractPath: 'result.tm_status.sync_info.latest_block_time', metricDataType: Date, addDate: true },
    { name: 'tm_status_sync_info_latest_block_height', help: 'Node? Latest Block Height', extractPath: 'result.tm_status.sync_info.latest_block_height', metricDataType: Number },
    { name: 'node_version', help: 'Node Minter Version', labelNames: ['version'], extractPath: 'result.version', extractor: (v, m) => simpleLabelExtractor(v, m, 'version') },
    { name: 'tm_status_node_info_network', help: 'Minter Network Type', labelNames: ['network'], extractPath: 'result.tm_status.node_info.network', extractor: (v, m) => simpleLabelExtractor(v, m, 'network') },
    { name: 'tm_status_node_info_id', help: 'Minter Node Network Id', labelNames: ['id'], extractPath: 'result.tm_status.node_info.id', extractor: (v, m) => simpleLabelExtractor(v, m, 'id') },
    { name: 'tm_status_node_info_listen_addr', help: 'Minter Node Listen Address', labelNames: ['listen_addr'], extractPath: 'result.tm_status.node_info.listen_addr', extractor: (v, m) => simpleLabelExtractor(v, m, 'listen_addr') },
    { name: 'tm_status_sync_info_catching_up', help: 'Node Catching Up', extractPath: 'result.tm_status.sync_info.catching_up', metricDataType: Boolean },
  ]
}

class TendermintMetricSet extends MetricSet {
  constructor() {
    super({ prefix: 'minter', labels: { target: '', moniker: '' } })

    keys(metrics).forEach(context => {
      metrics[context].forEach(metric => {
        super.add(context, clone(metric))
      })
    })
  }
}

module.exports = TendermintMetricSet
