# Database Export Information

**Export Date:** September 25, 2025 - 18:34:39  
**Database Type:** SQLite  
**Original File:** database.sqlite  
**File Size:** 417,792 bytes (408 KB)

## Export Files Created

1. **SQL Dump:** `database_export_20250925_183434.sql` (29,356 bytes)
   - Complete SQL dump with all table structures and data
   - Can be imported into any SQLite database
   - Contains CREATE TABLE statements and INSERT statements

2. **Binary Backup:** `database_backup_20250925_183439.sqlite` (417,792 bytes)
   - Exact copy of the original database file
   - Can be used directly as a SQLite database
   - Preserves all indexes and constraints

## Database Schema

### Tables Overview
| Table Name | Record Count | Description |
|------------|--------------|-------------|
| users | 7 | System users and administrators |
| radars | 5 | Radar speed detection devices |
| fines | 50 | Speed violation fines |
| cars | 0 | Vehicle information from plate recognition |
| violations | 0 | Traffic violations detected |
| plate_recognitions | 0 | Plate recognition processing results |
| reports | 0 | Generated system reports |
| audit_logs | 0 | System audit trail |
| report_types | - | Report template definitions |
| report_schedules | - | Scheduled report configurations |
| report_data | - | Report data storage |
| system_metrics | - | System performance metrics |
| radars_backup | - | Backup of radar configurations |

### Key Features
- **User Management:** Role-based access control (admin, operator, viewer)
- **Radar Management:** Speed detection device configuration
- **Fine Processing:** Automated fine calculation and management
- **Plate Recognition:** AI-powered license plate detection
- **Reporting System:** Comprehensive reporting and analytics
- **Audit Trail:** Complete system activity logging
- **External Data Integration:** FTP and UDP data processing

## How to Use the Export Files

### Restore from SQL Dump
```bash
# Create new database from SQL dump
sqlite3 new_database.sqlite < database_export_20250925_183434.sql

# Or restore to existing database
sqlite3 existing_database.sqlite ".read database_export_20250925_183434.sql"
```

### Use Binary Backup
```bash
# Simply copy the backup file
cp database_backup_20250925_183439.sqlite restored_database.sqlite

# Or rename it to replace current database
mv database_backup_20250925_183439.sqlite database.sqlite
```

### Import to MySQL/PostgreSQL
The SQL dump can be modified for other database systems:
1. Update data types (INTEGER → INT, TEXT → VARCHAR, etc.)
2. Modify AUTO_INCREMENT syntax
3. Adjust foreign key constraints
4. Update JSON column types if needed

## Database Configuration

Based on your `.env.example` file:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=radar_speed_detection
DB_USER=root
DB_PASSWORD=your_password
```

**Note:** Current database is SQLite, but configuration suggests MySQL setup for production.

## Security Considerations

- User passwords are hashed in the database
- JWT tokens are configured for authentication
- Audit logging tracks all system changes
- Role-based access control implemented

## External Data Integration

The database supports:
- **FTP Integration:** Image processing from external servers
- **UDP Integration:** Real-time radar data reception
- **AI Services:** OpenAI and Tesseract OCR integration
- **Automated Processing:** Background services for data processing

## Backup Recommendations

1. **Regular Backups:** Schedule daily database exports
2. **Version Control:** Keep multiple backup versions
3. **Off-site Storage:** Store backups in secure remote location
4. **Testing:** Regularly test backup restoration procedures
5. **Documentation:** Maintain backup and restore procedures

## Migration Notes

If migrating to production MySQL:
1. Use the SQL dump as a starting point
2. Update data types and constraints
3. Configure proper indexing for performance
4. Set up replication if needed
5. Update application configuration

---
*Generated automatically by Potassium Factory Radar Speed Detection System*
