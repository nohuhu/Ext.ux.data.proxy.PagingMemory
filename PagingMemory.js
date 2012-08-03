/**
 * Paging memory proxy, allows using in-memory dataset with paging grid.
 * Similar to Ext.ux.data.PagingMemoryProxy except that it's optimized for large
 * datasets.
 *  
 * Version 0.9.
 *  
 * Copyright (c) 2012 Alexander Tokarev.
 *
 * This code is licensed under the terms of the Open Source LGPL 3.0 license.
 * Commercial use is permitted to the extent that the code/component(s) do NOT
 * become part of another Open Source or Commercially licensed development library
 * or toolkit without explicit permission.
 * 
 * License details: http://www.gnu.org/licenses/lgpl.html
 */

Ext.define('Ext.ux.data.proxy.PagingMemory', {
    extend: 'Ext.data.proxy.Memory',
    alias:  'proxy.memorypaging',
    
    alternateClassName: 'Ext.data.proxy.PagingMemory',
    
    requires: [
        'Ext.data.ResultSet'
    ],

    /**
     * @cfg {Object} data
     * Optional data to pass to configured Reader.
     */

    constructor: function(config) {
        var me = this;
        
        me.callParent(arguments);

        //ensures that the reader has been instantiated properly
        me.setReader(me.reader);
        
        /*
         * Since we're operating on in-memory dataset, it's safe to assume
         * that the data is immutable. It's awfully inefficient to pull
         * the whole dataset through Reader *each time* a new page is
         * requested (that's what Ext.ux.data.PagingMemoryProxy does).
         * So we do that only once. If dataset is refreshing, it goes
         * through Reader again, of course.
         */
        me.setData(config.data);
    },
    
    read: function(operation, callback, scope) {
        var me = this,
            reader = me.reader,
            result, sorters, filters, filterFn, sorterFn, records, start, limit;
        
        result = me.getData();
        scope  = scope || me;
        
        /*
         * Filtering and sorting is necessary to be done
         * on the whole dataset, simulating remote sort.
         */
        filters = operation.filters;
        
        if ( filters.length > 0 ) {
            
            /*
             * Here we have an array of Ext.util.Filter objects to do filtering with,
             * so we construct a function that combines all filters by ANDing them together
             */
            records = [];
            
            filterFn = function(record) {
                var doesMatch = true;
                
                for ( var i = 0, l = filters.length; i < l; i++ ) {
                    var fn    = filters[i].filterFn,
                        scope = filters[i].scope;
                    
                    doesMatch = doesMatch && fn.call(scope, record);
                };
                
                if ( doesMatch ) {
                    records.push(record);
                };
            };
            
            for ( var i = 0, l = result.records.length; i < l; i++ ) {
                filterFn( result.records[i] );
            };
            
            result.records      = records;
            result.totalRecords = result.total = records.length;
        };
        
        // Sorting now
        sorters = operation.sorters;
        
        if ( sorters.length > 0 ) {
            
            // Same as with filters, one function to sort them all
            sorterFn = function(a, b) {
                var result, length;
                
                result = sorters[0].sort.call(sorters[0], a, b);
                
                // If there is more than one sorter, OR them together
                for ( var i = 1, l = sorters.length; i < l; i++ ) {
                    result = result || sorters[i].sort.call(sorters[i], a, b);
                };
                
                return result;
            };
            
            result.records.sort(sorterFn);
        };
        
        // Time to do paging
        start = operation.start;
        limit = operation.limit;
        
        if ( start !== undefined && limit !== undefined ) {
            result.records = result.records.slice(start, start + limit);
            result.count   = result.records.length;
        };
        
        Ext.apply(operation, {
            resultSet: result
        });
        
        operation.setCompleted();
        operation.setSuccessful();
        
        Ext.callback(callback, scope, [operation], 10);
    },
    
    // @private Return shallow copy of preprocessed dataset
    getData: function() {
        var me = this,
            data = me.data,
            records, result;
        
        records = data.records ? data.records.slice(0) : [];
        
        result = new Ext.data.ResultSet({
            count:        data.count,
            message:      data.message,
            records:      records,
            sucess:       data.success,
            total:        data.total,
            totalRecords: data.totalRecords
        });
        
        return result;
    },
    
    setData: function(data) {
        var me = this;
        
        if ( data && Ext.isArray(data) && data.length > 0 ) {
            me.data = me.reader.read(data);
        };
    }
});
