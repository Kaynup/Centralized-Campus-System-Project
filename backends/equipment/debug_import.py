import sys
sys.path.insert(0, '.')
import traceback
try:
    import main
    print('imported main', hasattr(main, 'app'), main.app)
except Exception as e:
    print(type(e).__name__, e)
    traceback.print_exc()
