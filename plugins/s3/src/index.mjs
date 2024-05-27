/**
 * Plugin maintained by: @architect
 */

import incomplete from './incomplete.mjs'
import lib from './lib.mjs'
const { getValidateHeaders, getHeadersFromParams, getQueryFromParams, paramMappings, parseHeadersToResults } = lib
import PutObject from './put-object.mjs'

const service = 's3'
const property = 'S3'
const required = true
const docRoot = 'https://docs.aws.amazon.com/AmazonS3/latest/API/'

// Validation types
// const arr = { type: 'array' }
const bool = { type: 'boolean' }
const obj = { type: 'object' }
const str = { type: 'string' }
const num = { type: 'number' }

const xml = { 'content-type': 'application/xml' }

const Bucket = { ...str, required, comment: 'S3 bucket name' }
const Key = { ...str, required, comment: 'S3 key / file name' }
const PartNumber = { ...num, comment: 'Part number (between 1 - 10,000) of the object' }
const VersionId = { ...str, comment: 'Reference a specific version of the object' }
const Delimiter = { ...str, comment: 'Delimiter character used to group keys' }
const EncodingType = { ...str, comment: 'Object key encoding type (must be `url`)' }
const Prefix = { ...str, comment: 'Limit response to keys that begin with the specified prefix' }
const valPaginate = { ...bool, comment: 'Enable automatic result pagination; use this instead of making your own individual pagination requests' }
const UploadId = { ...str, required, comment: 'ID of the multipart upload' }

function getHost ({ Bucket }, { region, config }) {
  // Deprecated path-style URLs, still necessary for buckets with periods
  if (/\./.test(Bucket)) {
    return {
      host: config.host || `s3.${region}.amazonaws.com`,
      pathPrefix: `/${Bucket}`,
    }
  }
  // Current virtual-hosted-style URls
  return { host: `${Bucket}.` + (config.host || `s3.${region}.amazonaws.com`) }
}
const defaultResponse = ({ payload }) => payload || {}
const defaultError = ({ statusCode, error }) => {
  // SDK v2 lowcases `code`
  if (error?.Code) {
    error.name = error.code = error.Code
    delete error.Code
  }
  return { statusCode, error }
}

const AbortMultipartUpload = {
  awsDoc: docRoot + 'API_AbortMultipartUpload.html',
  validate: {
    Bucket,
    Key,
    UploadId,
    ...getValidateHeaders('ExpectedBucketOwner', 'RequestPayer'),
  },
  request: (params, utils) => {
    const queryParams = [ 'UploadId' ]
    const { host, pathPrefix } = getHost(params, utils)
    const headers = getHeadersFromParams(params, queryParams)
    const query = getQueryFromParams(params, queryParams)
    return {
      method: 'DELETE',
      host,
      pathPrefix,
      path: `/${params.Key}`,
      query,
      headers,
    }
  },
  response: defaultResponse,
}

const CompleteMultipartUpload = {
  awsDoc: docRoot + 'API_CompleteMultipartUpload.html',
  validate: {
    Bucket,
    Key,
    UploadId,
    MultipartUpload: { ...obj, comment: '`MultipartUpload` object containing details about the completed uploads', ref: docRoot + 'API_CompleteMultipartUpload.html#AmazonS3-CompleteMultipartUpload-request-MultipartUpload' },
    ...getValidateHeaders(
      'ChecksumCRC32',
      'ChecksumCRC32C',
      'ChecksumSHA1',
      'ChecksumSHA256',
      'RequestPayer',
      'ExpectedBucketOwner',
      'SSECustomerAlgorithm',
      'SSECustomerKey',
      'SSECustomerKeyMD5',
    ),
  },
  request: (params, utils) => {
    const queryParams = [ 'UploadId' ]
    const { host, pathPrefix } = getHost(params, utils)
    const query = getQueryFromParams(params, queryParams)
    const CompleteMultipartUpload = {
      Part: params.MultipartUpload?.Parts || [],
    }

    return {
      host,
      pathPrefix,
      path: `/${params.Key}`,
      query,
      headers: { ...xml, ...getHeadersFromParams(params, queryParams) },
      payload: { CompleteMultipartUpload },
      xmlns: 'http://s3.amazonaws.com/doc/2006-03-01/',
    }
  },
  response: defaultResponse,
}

const CreateBucket = {
  awsDoc: docRoot + 'API_CreateBucket.html',
  validate: {
    Bucket,
    CreateBucketConfiguration: { ...obj, comment: 'Complete bucket configuration object', ref: docRoot + 'API_CreateBucket.html#API_CreateBucket_RequestSyntax' },
    ...getValidateHeaders('ACL', 'GrantFullControl', 'GrantRead', 'GrantReadACP', 'GrantWrite', 'GrantWriteACP', 'ObjectLockEnabledForBucket', 'ObjectOwnership'),
  },
  request: (params, utils) => {
    const { CreateBucketConfiguration } = params
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'PUT',
      host,
      pathPrefix,
      headers: { ...xml, ...getHeadersFromParams(params) },
      payload: CreateBucketConfiguration ? { CreateBucketConfiguration } : undefined,
    }
  },
  response: ({ headers }) => {
    return { Location: headers.Location || headers.location }
  },
}

// TODO: Check if this is working properly and fix the response
const CreateMultipartUpload = {
  awsDoc: docRoot + 'API_CreateMultipartUpload.html',
  validate: {
    Bucket,
    Key,
    ...getValidateHeaders(
      'ACL',
      'CacheControl',
      'ContentDisposition',
      'ContentEncoding',
      'ContentLanguage',
      'ContentType',
      'Expires',
      'GrantFullControl',
      'GrantRead',
      'GrantReadACP',
      'GrantWriteACP',
      'ServerSideEncryption',
      'StorageClass',
      'WebsiteRedirectLocation',
      'SSECustomerAlgorithm',
      'SSECustomerKeyMD5',
      'SSEKMSKeyId',
      'SSEKMSEncryptionContext',
      'BucketKeyEnabled',
      'RequestPayer',
      'Tagging',
      'ObjectLockMode',
      'ObjectLockRetainUntilDate',
      'ObjectLockLegalHoldStatus',
      'ExpectedBucketOwner',
      'ChecksumAlgorithm',
    ),
  },
  request: (params, utils) => {
    const { Key } = params
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'POST',
      host,
      pathPrefix,
      path: `/${Key}?uploads`,
      headers: { ...getHeadersFromParams(params) },
    }
  },
  response: ({ payload }) => {
    const { Bucket, Key, UploadId } = payload
    return {
      Bucket,
      Key,
      UploadId,
    }
  },
}

const DeleteBucket = {
  awsDoc: docRoot + 'API_DeleteBucket.html',
  validate: {
    Bucket,
    ...getValidateHeaders('ExpectedBucketOwner'),
  },
  request: (params, utils) => {
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'DELETE',
      host,
      pathPrefix,
      headers: { ...getHeadersFromParams(params) },
    }
  },
  response: () => ({}),
}

const DeleteObject = {
  awsDoc: docRoot + 'API_DeleteObject.html',
  validate: {
    Bucket,
    Key,
    VersionId,
    ...getValidateHeaders('MFA', 'RequestPayer', 'BypassGovernanceRetention', 'ExpectedBucketOwner'),
  },
  request: (params, utils) => {
    const { Key } = params
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'DELETE',
      host,
      pathPrefix,
      path: `/${Key}`,
      headers: { ...getHeadersFromParams(params) },
    }
  },
  response: defaultResponse,
}

const DeleteObjects = {
  awsDoc: docRoot + 'API_DeleteObjects.html',
  validate: {
    Bucket,
    Delete: { ...obj, required, comment: 'Object deletion request' },
    ...getValidateHeaders('MFA', 'RequestPayer', 'BypassGovernanceRetention', 'ExpectedBucketOwner', 'ChecksumAlgorithm', 'ContentMD5'),
  },
  request: async (params, utils) => {
    const { buildXML } = utils
    const { Delete } = params
    const payload = { Delete: { Object: Delete.Objects } }
    const payloadXML = buildXML(payload)
    const { createHash } = await import('node:crypto')
    const checksum = Buffer.from(createHash('sha256').update(payloadXML).digest()).toString('base64')
    const { host, pathPrefix } = getHost(params, utils)

    return {
      host,
      pathPrefix,
      path: '/?delete',
      headers: { ...xml, ...getHeadersFromParams(params), 'x-amz-checksum-sha256': checksum },
      payload,
    }
  },
  response: ({ payload }) => {
    let res = payload

    if (!payload.Deleted) {
      res.Deleted = []
    }
    if (!Array.isArray(payload.Deleted)) {
      res.Deleted = [ payload.Deleted ]
    }
    return res
  },
}

const GetBucketAccelerateConfiguration = {
  awsDoc: docRoot + 'API_GetBucketAccelerateConfiguration.html',
  validate: {
    Bucket,
    ...getValidateHeaders('ExpectedBucketOwner', 'RequestPayer'),
  },
  request: (params, utils) => {
    const { host, pathPrefix } = getHost(params, utils)
    return {
      path: '/?accelerate',
      host,
      pathPrefix,
      headers: { ...getHeadersFromParams(params) },
    }
  },
  response: ({ headers, payload }) => {
    return {
      Status: payload.Status,
      ...parseHeadersToResults({ headers }),
    }
  },
  error: defaultError,
}

const GetObject = {
  awsDoc: docRoot + 'API_GetObject.html',
  validate: {
    Bucket,
    Key,
    PartNumber,
    VersionId,
    // Here come the headers
    ...getValidateHeaders(
      'IfMatch',
      'IfModifiedSince',
      'IfNoneMatch',
      'IfUnmodifiedSince',
      'Range',
      'SSECustomerAlgorithm',
      'SSECustomerKey',
      'SSECustomerKeyMD5',
      'RequestPayer',
      'ExpectedBucketOwner',
      'ChecksumMode',
    ),
    ResponseCacheControl:       { ...str, comment: 'Sets response header: `cache-control`' },
    ResponseContentDisposition: { ...str, comment: 'Sets response header: `content-disposition`' },
    ResponseContentEncoding:    { ...str, comment: 'Sets response header: `content-encoding`' },
    ResponseContentLanguage:    { ...str, comment: 'Sets response header: `content-language`' },
    ResponseContentType:        { ...str, comment: 'Sets response header: `content-type`' },
    ResponseExpires:            { ...str, comment: 'Sets response header: `expires`' },
    // Not strictly necessary since users can pass this through with any request, but it's good for folks to know it's available on this particular method
    rawResponsePayload:         { ...bool, comment: 'Set to `true` to return payload as a buffer' },
    streamResponsePayload:      { ...bool, comment: 'Set to `true` to return payload as a Node.js stream' },
  },
  request: (params, utils) => {
    const { Key, rawResponsePayload = false, streamResponsePayload = false } = params
    const queryParams = [ 'PartNumber', 'ResponseCacheControl', 'ResponseContentDisposition',
      'ResponseContentEncoding', 'ResponseContentLanguage', 'ResponseContentType',
      'ResponseExpires', 'VersionId' ]
    const headers = getHeadersFromParams(params, queryParams)
    const query = getQueryFromParams(params, queryParams)
    const { host, pathPrefix } = getHost(params, utils)
    return {
      host,
      pathPrefix,
      path: `/${Key}`,
      headers,
      query,
      rawResponsePayload,
      streamResponsePayload,
    }
  },
  response: ({ headers, payload }) => {
    return {
      Body: payload,
      ...parseHeadersToResults({ headers }, null, []),
    }
  },
  error: defaultError,
}

const HeadBucket = {
  awsDoc: docRoot + 'API_HeadBucket.html',
  validate: {
    Bucket,
    ...getValidateHeaders('ExpectedBucketOwner'),
  },
  request: (params, utils) => {
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'HEAD',
      host,
      pathPrefix,
      headers: getHeadersFromParams(params),
    }
  },
  response: parseHeadersToResults,
  error: defaultError,
}

const HeadObject = {
  awsDoc: docRoot + 'API_HeadObject.html',
  validate: {
    Bucket,
    Key,
    PartNumber,
    VersionId,
    // Here come the headers
    ...getValidateHeaders('IfMatch', 'IfModifiedSince', 'IfNoneMatch', 'IfUnmodifiedSince',
      'Range', 'SSECustomerAlgorithm', 'SSECustomerKey', 'SSECustomerKeyMD5', 'RequestPayer',
      'ExpectedBucketOwner', 'ChecksumMode'),
  },
  request: (params, utils) => {
    const { Key } = params
    const queryParams = [ 'PartNumber', 'VersionId' ]
    const headers = getHeadersFromParams(params, queryParams)
    const query = getQueryFromParams(params, queryParams)
    const { host, pathPrefix } = getHost(params, utils)
    return {
      method: 'HEAD',
      host,
      pathPrefix,
      path: `/${Key}`,
      headers,
      query,
    }
  },
  response: ({ headers }) => parseHeadersToResults({ headers }, null, []),
  error: params => {
    if (params.statusCode === 404) {
      params.error = params.error || {}
      params.error.code = params.error.code || 'NotFound'
    }
    return defaultError(params)
  },
}

const ListBuckets = {
  awsDoc: docRoot + 'API_ListBuckets.html',
  validate: {},
  request: () => ({}),
  response: ({ payload }) => {
    let res = payload

    // Multiple buckets
    if (!payload.Buckets) {
      res.Buckets = []
    }
    if (!Array.isArray(payload.Buckets)) {
      res.Buckets = [ payload.Buckets ]
    }
    res.Buckets = res.Buckets.map(i => i.Bucket ? i.Bucket : i)
    return res
  },
  error: defaultError,
}

const ListMultipartUploads = {
  awsDoc: docRoot + 'API_ListMultipartUploads.html',
  validate: {
    Bucket,
    Delimiter,
    EncodingType,
    KeyMarker: { ...str, comment: 'Pagination cursor' },
    MaxUploads: { ...num, comment: 'Maximum number of uploads between 1 and 1000 (inclusive) to return in the response' },
    UploadIdMarker: { ...str, comment: 'Deal with this later' },
    ...getValidateHeaders('ExpectedBucketOwner', 'RequestPayer'),
    paginate: valPaginate,
  },
  request: (params, utils) => {
    const queryParams = [ 'Delimiter', 'EncodingType', 'KeyMarker', 'MaxUploads', 'UploadMarker' ]
    const { host, pathPrefix } = getHost(params, utils)
    const headers = getHeadersFromParams(params, queryParams + [ 'paginate' ])
    let query = { uploads: ' ',  ...getQueryFromParams(params, queryParams) }
    let paginate
    if (params.paginate) paginate = true
    return {
      host,
      pathPrefix,
      headers,
      query,
      paginate,
      paginator: {
        type: 'query',
        cursor: [ 'key-marker', 'upload-id-marker' ],
        token: [ 'NextKeyMarker', 'NextUploadIdMarker' ],
        accumulator: 'Upload',
      },
    }
  },
  response: ({ payload }) => {
    const Upload = payload.Upload
    if (Array.isArray(Upload)) {
      return { Uploads: Upload }
    }
    else if (typeof Upload === 'object') {
      return { Uploads: [ Upload ] }
    }
    return []
  },
}

const ListObjectsV2 = {
  awsDoc: docRoot + 'API_ListObjectsV2.html',
  validate: {
    Bucket,
    ContinuationToken:  { ...str, comment: 'Pagination cursor token (returned as `NextContinuationToken`' },
    Delimiter,
    EncodingType,
    FetchOwner:         { ...str, comment: 'Return owner field with results' },
    MaxKeys:            { ...num, comment: 'Set the maximum number of keys returned per response' },
    Prefix,
    StartAfter:         { ...str, comment: 'Starts listing after any specified key in the bucket' },
    // Here come the headers
    ...getValidateHeaders('RequestPayer', 'ExpectedBucketOwner', 'OptionalObjectAttributes'),
    paginate:           valPaginate,
  },
  request: (params, utils) => {
    const { paginate } = params
    const queryParams = [ 'ContinuationToken', 'Delimiter', 'EncodingType', 'FetchOwner', 'MaxKeys', 'Prefix', 'StartAfter' ]
    const headers = getHeadersFromParams(params, queryParams)
    const query = getQueryFromParams(params, queryParams) || {}
    query['list-type'] = 2
    const { host, pathPrefix } = getHost(params, utils)
    return {
      host,
      pathPrefix,
      headers,
      query,
      paginate,
      paginator: { type: 'query', cursor: 'continuation-token', token: 'NextContinuationToken', accumulator: 'Contents' },
    }
  },
  response: ({ headers, payload }) => {
    const res = payload
    const charged = 'x-amz-request-charged'
    if (headers[charged]) res[paramMappings[charged]] = headers[charged]

    if (!payload.Contents) {
      res.Contents = []
    }
    if (payload.Contents) {
      res.Contents = Array.isArray(payload.Contents) ? payload.Contents : [ payload.Contents ]
    }
    return res
  },
  error: defaultError,
}

const UploadPart = {
  awsDoc: docRoot + 'API_UploadPart.html',
  validate: {
    Bucket,
    Key,
    PartNumber,
    Body: { ...obj, comment: 'Stream of data to be uploaded', ref: docRoot + 'AmazonS3/latest/API/API_UploadPart.html#API_UploadPart_RequestBody' },
    ...getValidateHeaders(
      'ContentLength',
      'ContentMD5',
      'ChecksumAlgorithm',
      'ChecksumCRC32',
      'ChecksumCRC32C',
      'ChecksumSHA1',
      'ChecksumSHA256',
      'SSECustomerAlgorithm',
      'SSECustomerKey',
      'SSECustomerKeyMD5',
      'RequestPayer',
      'ExpectedBucketOwner',
    ),
  },
  request: (params, utils) => {
    const { Key, Body } = params
    const queryParams = [ 'PartNumber', 'UploadId' ]
    const { host, pathPrefix } = getHost(params, utils)
    const headers = getHeadersFromParams(params)
    const query = getQueryFromParams(params, queryParams)
    return {
      method: 'PUT',
      host,
      pathPrefix,
      path: `/${Key}`,
      query,
      headers,
      payload: { ...Body },
    }
  },
  response: defaultResponse,
}


const methods = {
  AbortMultipartUpload,
  CompleteMultipartUpload,
  CreateBucket,
  CreateMultipartUpload,
  DeleteBucket,
  DeleteObject,
  DeleteObjects,
  GetBucketAccelerateConfiguration,
  GetObject,
  HeadObject,
  HeadBucket,
  ListBuckets,
  ListMultipartUploads,
  ListObjectsV2,
  PutObject,
  UploadPart,
  ...incomplete }

export default {
  name: '@aws-lite/s3',
  service,
  property,
  methods,
}
