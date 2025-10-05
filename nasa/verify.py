import pandas as pd
import os

def check_files():
    print("🔍 Checking MANTIS files...")
    
    files = [
        'nasa_satellite_predictions.csv',
        'nasa_mantis_tag_data.csv', 
        'nasa_combined_display_data.csv',
        'nasa_mantis_report.txt',
        'judge_quick_reference.txt'
    ]
    
    all_good = True
    for file in files:
        if os.path.exists(file):
            size = os.path.getsize(file) / 1024
            print(f"   ✅ {file} ({size:.1f} KB)")
        else:
            print(f"   ❌ {file} - MISSING!")
            all_good = False
    
    if all_good:
        # Check data quality
        try:
            sat_df = pd.read_csv('nasa_satellite_predictions.csv')
            tag_df = pd.read_csv('nasa_mantis_tag_data.csv')
            
            print(f"\n📊 Data Summary:")
            print(f"   🛰️ Predictions: {len(sat_df)}")
            print(f"   🏷️ Validations: {len(tag_df)}")
            
            if len(tag_df) > 0:
                accuracy = len(tag_df[tag_df['prediction_accuracy'] == 'correct']) / len(tag_df)
                print(f"   🎯 Accuracy: {accuracy:.1%}")
            
            print(f"\n🏆 STATUS: READY FOR HACKATHON!")
            
        except Exception as e:
            print(f"❌ Error reading data: {e}")
    else:
        print(f"\n❌ Some files missing - rerun: python mantis_nasa_generator.py")

if __name__ == "__main__":
    check_files()
