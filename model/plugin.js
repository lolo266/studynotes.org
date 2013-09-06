var _s = require('underscore.string')
var async = require('async')
var config = require('../config')
var mongoose = require('mongoose')

/**
 * Mongoose plugins
 */

exports.modifyDate = function (schema, opts) {
  schema.add({ modifyDate: Date })

  schema.pre('save', function (next) {
    this.modifyDate = new Date
    next()
  })

  if (opts && opts.index) {
    schema.path('modifyDate').index(opts.index)
  }
}

exports.createDate = function (schema, opts) {
  schema.add({ createDate: Date })

  schema.pre('save', function (next) {
    if (!this.createDate) this.createDate = new Date
    next()
  })

  if (opts && opts.index) {
    schema.path('createDate').index(opts.index)
  }
}

exports.hits = function (schema, opts) {
  schema.add({ hits: { type: Number, default: 0 } })

  schema.pre('save', function (next) {
    if (!this.hits) this.hits = 0
    next()
  })

  if (opts && opts.index) {
    schema.path('hits').index(opts.index)
  }

  // Update hit count, asyncronously
  schema.methods.hit = function (cb) {
    cb || (cb = function () {})
    this.update({ $inc: { hits: 1 } }, { upsert: true }, cb)
  }
}

exports.absoluteUrl = function (schema, opts) {
  if (schema.virtualpath('url')) {
    schema.virtual('absoluteUrl').get(function () {
      return config.siteOrigin + this.url
    })
  } else {
    throw new Error('Missing url path, so cannot use plugin.absolutePath')
  }
}

/**
 * Automatic slug generation.
 *
 * If schema has a "slug" field, set up a pre-save hook to check for
 * existence of slug. When no slug is set at save time, we automatically
 * generate one.
 */
exports.slug = function (schema, opts) {
  schema.pre('save', function (next) {
    var doc = this

    if (doc.slug) return next()

    var num = 0 // number to append to slug to try to make it unique
    var done = false
    var potentialSlug
    var initialSlug

    potentialSlug = initialSlug = _s.slugify(doc.name)

    async.whilst(function () {
      return !done
    },
    function (cb) {
      // After the first try, append a number to end of slug
      if (num > 0) {
        potentialSlug = initialSlug + '-' + num
      }
      num += 1

      mongoose.model(opts.model)
        .count({ slug: potentialSlug }, function (err, count) {
          if (err) return cb(err)

          if (count === 0) {
            doc.slug = potentialSlug
            done = true
          }

          cb()
        })
    }, next)
  })
}