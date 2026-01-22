import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Create styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    // Header
    header: {
        marginBottom: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        paddingBottom: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    headerLeft: {
        flex: 1, // Take available space
        justifyContent: 'flex-end',
        paddingRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
        alignSelf: 'flex-start',
    },
    // Primary info line (Vehicle)
    vehicleLine: {
        fontSize: 12,
        color: '#000000',
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 2,
    },
    // Secondary info line (Customer) 
    customerLine: {
        fontSize: 10,
        color: '#000000',
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
    },

    // Date Block Wrapper
    dateBlock: {
        width: 180, // Widened to fit date content
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
    },
    // Date Rows
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginBottom: 2,
    },
    dateLabel: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        textAlign: 'right',
        width: 45,
        marginRight: 8,
    },
    dateValue: {
        fontSize: 10,
        color: '#000000',
        textTransform: 'uppercase',
        width: 90,
        textAlign: 'right',
    },
    // Thicker Due Date
    dateValueLarge: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        textTransform: 'uppercase',
        width: 90,
        textAlign: 'right',
    },
    durationText: {
        fontSize: 9,
        color: '#000000',
        fontStyle: 'italic',
        marginTop: 2,
        marginBottom: 4,
        backgroundColor: '#EEEEEE',
        paddingHorizontal: 4,
        paddingVertical: 1,
        textAlign: 'center',
        alignSelf: 'flex-end',
    },
    vinText: {
        fontSize: 9,
        fontFamily: 'Helvetica-Bold',
        color: '#000000',
        textTransform: 'uppercase',
        marginTop: 2,
    },

    // Section Basics
    section: {
        marginTop: 15,
        marginBottom: 5,
    },
    // Clean Section Title (No Black BG)
    sectionTitle: {
        fontSize: 12, // Increased size
        color: '#000000', // Black text
        // backgroundColor: '#000000', // REMOVED
        textTransform: 'uppercase',
        fontFamily: 'Helvetica-Bold',
        marginBottom: 8,
        borderBottomWidth: 1, // Underline for separation
        borderBottomColor: '#000000',
        paddingBottom: 2,
    },
    row: {
        flexDirection: 'row',
        gap: 15,
    },

    // Notes
    notesBox: {
        padding: 5,
        // borderWidth: 1, // Optional: remove border for cleaner look if desired, but keeping frame is safer for "Box" feel.
        borderWidth: 1,
        borderColor: '#000000',
        minHeight: 60, // A bit taller
    },
    notesText: {
        fontSize: 12, // Increased from 10
        color: '#000000',
        lineHeight: 1.4, // Better readability
    },

    // Layout Columns
    column: {
        flex: 1,
    },

    // Job Details Header - Clean Style
    typeHeaderBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // backgroundColor: '#000000', // REMOVED
        borderBottomWidth: 1, // Underline
        borderBottomColor: '#000000',
        paddingBottom: 4,
        marginBottom: 8,
    },
    typeHeaderTitle: {
        color: '#000000', // Black
        fontSize: 12, // Increased
        fontFamily: 'Helvetica-Bold',
    },
    typeHeaderCount: {
        color: '#000000', // Black
        fontSize: 12, // Increased
        fontFamily: 'Helvetica-Bold',
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 6, // Slightly more space between items
        paddingRight: 5,
    },
    bullet: {
        fontSize: 12,
        marginRight: 6,
    },
    itemText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 1.4,
        fontFamily: 'Helvetica-Bold',
    },

    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#666',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        paddingTop: 10,
    }
});

const PDFOrder = ({ data }) => {
    const { customer, vehicle, dates, items, notes } = data;

    // Helper: Parse date string (handles YYYY-MM-DD or MM/DD/YYYY)
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        try {
            if (dateStr.includes('-')) {
                // ISO format YYYY-MM-DD
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
            } else if (dateStr.includes('/')) {
                // MM/DD/YYYY or MM/DD
                const parts = dateStr.split('/').map(Number);
                const currentYear = new Date().getFullYear();
                if (parts.length === 3) {
                    return new Date(parts[2], parts[0] - 1, parts[1]);
                } else {
                    return new Date(currentYear, parts[0] - 1, parts[1]);
                }
            }
        } catch (e) {
            return null;
        }
        return null; // Fallback
    };

    // Helper: Format Date as "MM/DD DAY" (First 3 chars uppercase)
    const formatDateWithDay = (dateStr) => {
        const date = parseDate(dateStr);
        if (!date) return dateStr || "";

        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const dayName = days[date.getDay()];
        return `${mm}/${dd} ${dayName}`;
    };

    // Helper: Calculate duration
    const getDuration = () => {
        if (!dates?.start || !dates?.end) return "";
        try {
            const start = parseDate(dates.start);
            const end = parseDate(dates.end);
            if (!start || !end) return "";

            const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            return diff > 0 ? `${diff} DAYS` : "";
        } catch (e) { return "" }
    };
    const duration = getDuration();

    // Helper: Filter items by type AND exclude blanks
    const getItemsByType = (type) => items.filter(
        item => item.type === type && item.desc && item.desc.trim().length > 0
    );

    const repairItems = getItemsByType('Repair');
    const replaceItems = getItemsByType('Replace');
    const blendItems = getItemsByType('Blend');
    const fourthQuadrantItems = items.filter(
        item => (item.type === 'Polish/Touch up' || item.type === 'Other') && item.desc && item.desc.trim().length > 0
    );

    // Determine 4th Quadrant Title
    const hasOtherItems = fourthQuadrantItems.some(item => item.type === 'Other');
    const fourthQuadrantTitle = hasOtherItems ? 'OTHER' : 'POLISH';

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.headerTitle}>WORK ORDER</Text>

                        {/* Vehicle - Moved to Top Line */}
                        <Text style={styles.vehicleLine}>
                            {vehicle.year} {vehicle.makeModel} {vehicle.plate ? ` • ${vehicle.plate}` : ''}
                        </Text>

                        {/* Customer - Moved Below Vehicle */}
                        <Text style={styles.customerLine}>
                            {customer.name || 'NO NAME'} {customer.phone ? ` • ${customer.phone}` : ''}
                        </Text>
                    </View>

                    <View style={styles.dateBlock}>
                        <View>
                            {/* Start Date */}
                            <View style={styles.dateRow}>
                                <Text style={styles.dateLabel}>START:</Text>
                                <Text style={styles.dateValue}>{dates?.start ? formatDateWithDay(dates.start) : 'N/A'}</Text>
                            </View>

                            {/* Due Date (Amplified) */}
                            <View style={styles.dateRow}>
                                <Text style={styles.dateLabel}>DUE:</Text>
                                <Text style={styles.dateValueLarge}>{dates?.end ? formatDateWithDay(dates.end) : 'N/A'}</Text>
                            </View>

                            {/* Duration Pilled Below */}
                            {duration && <Text style={styles.durationText}>{duration}</Text>}
                        </View>

                        {/* VIN - Aligned right, bottom of block */}
                        {vehicle.vin && (
                            <Text style={styles.vinText}>VIN: {vehicle.vin}</Text>
                        )}
                    </View>
                </View>

                {/* Special Instructions (Notes) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Special Instructions</Text>
                    <View style={styles.notesBox}>
                        <Text style={styles.notesText}>{notes || ""}</Text>
                    </View>
                </View>

                {/* Job Details 2x2 Grid - HEADER REMOVED */}
                <View style={{ marginTop: 20 }}>
                    {/* Removed the 'Job Details' sectionTitle here */}

                    {/* Row 1 */}
                    <View style={{ flexDirection: 'row', gap: 20, marginBottom: 20 }}>
                        {/* REPAIR */}
                        <View style={styles.column}>
                            <View style={styles.typeHeaderBox}>
                                <Text style={styles.typeHeaderTitle}>REPAIR</Text>
                                <Text style={styles.typeHeaderCount}>{repairItems.length}</Text>
                            </View>
                            {repairItems.map((item, i) => (
                                <View key={i} style={styles.listItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.itemText}>{item.desc.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>

                        {/* REPLACE */}
                        <View style={styles.column}>
                            <View style={styles.typeHeaderBox}>
                                <Text style={styles.typeHeaderTitle}>REPLACE</Text>
                                <Text style={styles.typeHeaderCount}>{replaceItems.length}</Text>
                            </View>
                            {replaceItems.map((item, i) => (
                                <View key={i} style={styles.listItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1 }}>
                                        <Text style={styles.itemText}>{item.desc.toUpperCase()}</Text>
                                        {item.partNum && (
                                            <Text style={{ fontSize: 9, color: '#444', marginLeft: 'auto', paddingLeft: 8, fontStyle: 'italic', textAlign: 'right', minWidth: 60 }}>
                                                {item.partNum}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Row 2 */}
                    <View style={{ flexDirection: 'row', gap: 20 }}>
                        {/* BLEND */}
                        <View style={styles.column}>
                            <View style={styles.typeHeaderBox}>
                                <Text style={styles.typeHeaderTitle}>BLEND</Text>
                                <Text style={styles.typeHeaderCount}>{blendItems.length}</Text>
                            </View>
                            {blendItems.map((item, i) => (
                                <View key={i} style={styles.listItem}>
                                    <Text style={styles.bullet}>•</Text>
                                    <Text style={styles.itemText}>{item.desc.toUpperCase()}</Text>
                                </View>
                            ))}
                        </View>

                        {/* 4th QUADRANT (POLISH or OTHER) */}
                        <View style={styles.column}>
                            <View style={styles.typeHeaderBox}>
                                <Text style={styles.typeHeaderTitle}>{fourthQuadrantTitle}</Text>
                                <Text style={styles.typeHeaderCount}>{fourthQuadrantItems.length}</Text>
                            </View>
                            {fourthQuadrantItems.map((item, i) => {
                                let displayText = item.desc.toUpperCase();
                                if (item.type === 'Other' && item.customTitle) {
                                    displayText = `[${item.customTitle.toUpperCase()}] - ${displayText}`;
                                }
                                return (
                                    <View key={i} style={styles.listItem}>
                                        <Text style={styles.bullet}>•</Text>
                                        <Text style={styles.itemText}>{displayText}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>311 Auto Body • Work Order System</Text>
                </View>

            </Page>
        </Document>
    );
};

export default PDFOrder;
